import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../App'
import { Task, TaskFormData, AIAnalysis } from '../types'
import MistralClient from '@mistralai/mistralai'

const apiKey = import.meta.env.VITE_MISTRAL_API_KEY
const client = new MistralClient(apiKey) 

interface DashboardProps {
  session: any
}

const Dashboard = ({ session }: DashboardProps) => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [session])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('due_date', { ascending: true })

      if (error) throw error
      setTasks(data || [])
      await analyzeTasksWithAI(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeTasksWithAI = async (tasks: Task[]) => {
    try {
      // Analyse des tâches par statut
      const completedTasks = tasks.filter(task => task.status === 'done')
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress')
      const todoTasks = tasks.filter(task => task.status === 'todo')

      // Calcul des statistiques
      const totalTasks = tasks.length
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks * 100).toFixed(1) : 0
      
      const prompt = `En tant qu'assistant personnel de gestion des tâches, analyse la situation actuelle et adresse-toi directement à l'utilisateur :

1. RÉSUMÉ DE VOTRE SITUATION :
- Votre taux de complétion : ${completionRate}% (${completedTasks.length}/${totalTasks} tâches terminées)
- Vos tâches en cours : ${inProgressTasks.length}
- Vos tâches à faire : ${todoTasks.length}

2. DÉTAIL DE VOS TÂCHES :
Tâches que vous avez terminées :
${completedTasks.map(task => `- ${task.title} (priorité: ${task.priority})`).join('\n')}

Tâches sur lesquelles vous travaillez :
${inProgressTasks.map(task => `- ${task.title} (priorité: ${task.priority}, échéance: ${new Date(task.due_date).toLocaleDateString()})`).join('\n')}

Tâches qu'il vous reste à faire :
${todoTasks.map(task => `- ${task.title} (priorité: ${task.priority}, échéance: ${new Date(task.due_date).toLocaleDateString()})`).join('\n')}

Analyse ces informations et fournis deux réponses personnalisées :
1. Un résumé encourageant de la progression et de la charge de travail actuelle, en utilisant "vous" et un ton positif et motivant
2. Une suggestion personnalisée pour la prochaine tâche à traiter, en expliquant pourquoi elle devrait être prioritaire pour vous, en tenant compte de vos priorités et échéances actuelles`

      const chatResponse = await client.chat({
        model: "mistral-tiny",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 1000,
      })

      const analysis = chatResponse.choices[0].message.content
      const [summary, nextTask] = analysis.split('\n\n').map(text => text.trim())

      setAiAnalysis({
        weekly_summary: summary.replace(/^1\. /, ''),
        next_task_suggestion: nextTask.replace(/^2\. /, ''),
      })
    } catch (error) {
      console.error('Error analyzing tasks with AI:', error)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
      
      const { data: updatedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('due_date', { ascending: true })
      
      if (updatedTasks) {
        setTasks(updatedTasks)
        await analyzeTasksWithAI(updatedTasks)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      
      const { data: updatedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('due_date', { ascending: true })
      
      if (updatedTasks) {
        setTasks(updatedTasks)
        await analyzeTasksWithAI(updatedTasks)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mes Tâches</h1>
          <button
            onClick={() => navigate('/add-task')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:bg-indigo-500 transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Nouvelle Tâche
          </button>
        </div>

        {aiAnalysis && (
          <div className="mb-12 bg-white shadow-xl rounded-2xl p-8 backdrop-blur-lg bg-opacity-90">
            <div className="flex items-center mb-6 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">Assistant IA</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-indigo-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Résumé de la semaine</h3>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{aiAnalysis.weekly_summary}</p>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Prochaine tâche suggérée</h3>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{aiAnalysis.next_task_suggestion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 backdrop-blur-lg bg-opacity-90 border border-gray-100"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{task.title}</h3>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-full transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-3">{task.description}</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                  className={`block w-full rounded-lg shadow-sm text-sm transition-colors duration-200 ${
                    task.status === 'done' ? 'bg-green-50 text-green-700 border-green-200' :
                    task.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 