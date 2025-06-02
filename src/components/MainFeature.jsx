import { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { useSelector } from 'react-redux'
import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns'
import { AuthContext } from '../App'
import ApperIcon from './ApperIcon'
import taskService from '../services/taskService'

const MainFeature = () => {
  const [tasks, setTasks] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending'
  })

  const { logout } = useContext(AuthContext)
  const { user, isAuthenticated } = useSelector((state) => state.user)

  // Load tasks from backend on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTasks()
    }
  }, [isAuthenticated, filter, searchTerm])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const params = {}
      
      if (searchTerm) {
        params.search = searchTerm
      }
      
      if (filter !== 'all') {
        if (filter === 'high-priority') {
          params.priority = 'high'
        } else if (filter !== 'overdue') {
          params.status = filter
        }
      }

      const fetchedTasks = await taskService.fetchTasks(params)
      setTasks(fetchedTasks || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error(error.message || 'Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    try {
      setSubmitting(true)
      
      if (selectedTask) {
        // Update existing task
        const updatedTask = await taskService.updateTask(selectedTask.id, formData)
        setTasks(tasks.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        ))
        toast.success('Task updated successfully!')
        setSelectedTask(null)
      } else {
        // Create new task
        const newTask = await taskService.createTask(formData)
        setTasks([newTask, ...tasks])
        toast.success('Task created successfully!')
      }

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        status: 'pending'
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error(error.message || 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (task) => {
    setSelectedTask(task)
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      status: task.status || 'pending'
    })
    setShowAddForm(true)
  }

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      setLoading(true)
      await taskService.deleteTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      toast.success('Task deleted successfully!')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskStatus = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed'
      const updatedTaskData = {
        ...task,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
      }

      const updatedTask = await taskService.updateTask(taskId, updatedTaskData)
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t))
      toast.success(`Task marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error(error.message || 'Failed to update task status')
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    switch (filter) {
      case 'completed':
        return task.status === 'completed'
      case 'pending':
        return task.status === 'pending'
      case 'in-progress':
        return task.status === 'in-progress'
      case 'high-priority':
        return task.priority === 'high' || task.priority === 'urgent'
      case 'overdue':
        return task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed'
      default:
        return true
    }
  })

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return 'AlertTriangle'
      case 'high': return 'ArrowUp'
      case 'medium': return 'Minus'
      case 'low': return 'ArrowDown'
      default: return 'Minus'
    }
  }

  const getDateDisplay = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isThisWeek(date)) return format(date, 'EEEE')
    return format(date, 'MMM dd')
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed').length
  }

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-8 sm:p-12 text-center"
        >
          <div className="neu-button w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
            <ApperIcon name="Lock" className="h-8 w-8 sm:h-10 sm:w-10 text-surface-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-surface-900 dark:text-white mb-2">
            Authentication Required
          </h3>
          <p className="text-surface-600 dark:text-surface-400">
            Please log in to access your tasks and manage your workflow.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* User Welcome & Logout */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
              Welcome back, {user?.firstName || user?.name || 'User'}!
            </h2>
            <p className="text-surface-600 dark:text-surface-400">
              Manage your tasks and stay organized
            </p>
          </div>
          <button
            onClick={logout}
            className="neu-button px-4 py-2 text-surface-600 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 transition-colors duration-200 rounded-xl flex items-center space-x-2"
          >
            <ApperIcon name="LogOut" className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Header Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {[
          { label: 'Total Tasks', value: stats.total, icon: 'List', color: 'blue' },
          { label: 'Completed', value: stats.completed, icon: 'CheckCircle2', color: 'green' },
          { label: 'Pending', value: stats.pending, icon: 'Clock', color: 'yellow' },
          { label: 'Overdue', value: stats.overdue, icon: 'AlertCircle', color: 'red' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 font-medium">
                  {stat.label}
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-surface-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-2 sm:p-3 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <ApperIcon 
                  name={stat.icon} 
                  className={`h-5 w-5 sm:h-6 sm:w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-md">
              <ApperIcon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-surface-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 sm:py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="high-priority">High Priority</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Add Task Button */}
          <motion.button
            onClick={() => {
              setShowAddForm(true)
              setSelectedTask(null)
              setFormData({
                title: '',
                description: '',
                priority: 'medium',
                dueDate: '',
                status: 'pending'
              })
            }}
            disabled={loading}
            className="neu-button px-4 sm:px-6 py-2 sm:py-3 text-primary-600 hover:text-primary-700 transition-colors duration-200 rounded-xl flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            <ApperIcon name="Plus" className="h-5 w-5" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Task Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !submitting && setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
                  {selectedTask ? 'Edit Task' : 'Add New Task'}
                </h3>
                <button
                  onClick={() => !submitting && setShowAddForm(false)}
                  disabled={submitting}
                  className="neu-button p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ApperIcon name="X" className="h-5 w-5 text-surface-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    disabled={submitting}
                    rows={3}
                    className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter task description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      disabled={submitting}
                      className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      disabled={submitting}
                      className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {submitting && <ApperIcon name="Loader2" className="h-4 w-4 animate-spin" />}
                    <span>{selectedTask ? 'Update' : 'Create'} Task</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel rounded-xl p-8 sm:p-12 text-center"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg sm:text-xl font-semibold text-surface-900 dark:text-white mb-2">
              Loading tasks...
            </h3>
            <p className="text-surface-600 dark:text-surface-400">
              Please wait while we fetch your tasks
            </p>
          </motion.div>
        ) : filteredTasks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel rounded-xl p-8 sm:p-12 text-center"
          >
            <div className="neu-button w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
              <ApperIcon name="ClipboardList" className="h-8 w-8 sm:h-10 sm:w-10 text-surface-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-surface-900 dark:text-white mb-2">
              {searchTerm || filter !== 'all' ? 'No tasks match your criteria' : 'No tasks yet'}
            </h3>
            <p className="text-surface-600 dark:text-surface-400">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter settings' 
                : 'Create your first task to get started with TaskFlow'
              }
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="task-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Task Status Checkbox */}
                  <button
                    onClick={() => toggleTaskStatus(task.id)}
                    disabled={loading}
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-surface-300 dark:border-surface-600 hover:border-primary-500'
                    }`}
                  >
                    {task.status === 'completed' && (
                      <ApperIcon name="Check" className="h-4 w-4" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-lg font-semibold truncate ${
                          task.status === 'completed' 
                            ? 'text-surface-500 dark:text-surface-400 line-through' 
                            : 'text-surface-900 dark:text-white'
                        }`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-surface-600 dark:text-surface-300 text-sm mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Task Meta */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Priority Badge */}
                        <div className={`priority-badge priority-${task.priority} flex items-center space-x-1`}>
                          <ApperIcon name={getPriorityIcon(task.priority)} className="h-3 w-3" />
                          <span className="capitalize">{task.priority}</span>
                        </div>

                        {/* Status Badge */}
                        <div className={`status-badge status-${task.status}`}>
                          {task.status.replace('-', ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Task Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mt-4">
                      {/* Due Date */}
                      <div className="flex items-center space-x-2 text-sm">
                        {task.dueDate && (
                          <div className={`flex items-center space-x-1 ${
                            isPast(new Date(task.dueDate)) && task.status !== 'completed'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-surface-600 dark:text-surface-400'
                          }`}>
                            <ApperIcon name="Calendar" className="h-4 w-4" />
                            <span>{getDateDisplay(task.dueDate)}</span>
                            {isPast(new Date(task.dueDate)) && task.status !== 'completed' && (
                              <span className="text-xs font-medium">(Overdue)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(task)}
                          disabled={loading}
                          className="neu-button p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ApperIcon name="Edit2" className="h-4 w-4 text-surface-600 dark:text-surface-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={loading}
                          className="neu-button p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ApperIcon name="Trash2" className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default MainFeature