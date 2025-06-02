import { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import { useSelector } from 'react-redux'
import { AuthContext } from '../App'
import MainFeature from '../components/MainFeature'
import ApperIcon from '../components/ApperIcon'

const Home = () => {
const [darkMode, setDarkMode] = useState(false)
  const { logout } = useContext(AuthContext)
  const { isAuthenticated } = useSelector((state) => state.user)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <div className="glass-panel border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 sm:h-20">
              <motion.div 
                className="flex items-center space-x-3"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="neu-button p-2 sm:p-3">
                  <ApperIcon 
                    name="CheckSquare" 
                    className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" 
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-surface-900 dark:text-white">
                    TaskFlow
                  </h1>
                  <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-300 hidden sm:block">
                    Organize Your Work
                  </p>
                </div>
              </motion.div>

              <motion.button
                onClick={toggleDarkMode}
                className="neu-button p-2 sm:p-3"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ApperIcon 
                  name={darkMode ? "Sun" : "Moon"} 
                  className="h-5 w-5 sm:h-6 sm:w-6 text-surface-700 dark:text-surface-300" 
                />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          <MainFeature />
        </div>
      </main>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 sm:w-32 sm:h-32 bg-primary-200/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-16 h-16 sm:w-24 sm:h-24 bg-secondary-200/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 sm:w-40 sm:h-40 bg-accent/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-1/3 w-18 h-18 sm:w-28 sm:h-28 bg-primary-300/15 rounded-full blur-xl"></div>
      </div>
    </div>
  )
}

export default Home