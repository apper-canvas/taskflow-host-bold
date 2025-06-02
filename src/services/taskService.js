// Task Service for handling all task-related API operations
class TaskService {
  constructor() {
    const { ApperClient } = window.ApperSDK
    this.apperClient = new ApperClient({
      apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
      apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
    })
    this.tableName = 'task39'
    
    // Define all fields from the task39 table
    this.allFields = [
      'Name', 'Tags', 'Owner', 'CreatedOn', 'CreatedBy', 'ModifiedOn', 'ModifiedBy',
      'title', 'description', 'priority', 'due_date', 'status', 'created_at', 'updated_at', 'completed_at'
    ]
    
    // Define only updateable fields for create/update operations
    this.updateableFields = [
      'Name', 'Tags', 'Owner', 'title', 'description', 'priority', 'due_date', 'status', 'created_at', 'updated_at', 'completed_at'
    ]
  }

  // Fetch all tasks with optional filtering and pagination
  async fetchTasks(params = {}) {
    try {
      const queryParams = {
        fields: this.allFields,
        orderBy: [
          {
            fieldName: "created_at",
            SortType: "DESC"
          }
        ],
        pagingInfo: {
          limit: params.limit || 100,
          offset: params.offset || 0
        }
      }

      // Add search filtering if provided
      if (params.search) {
        queryParams.where = [
          {
            fieldName: "title",
            operator: "Contains",
            values: [params.search]
          }
        ]
        queryParams.whereGroups = [
          {
            operator: "OR",
            subGroups: [
              {
                conditions: [
                  {
                    fieldName: "title",
                    operator: "Contains",
                    values: [params.search]
                  }
                ],
                operator: ""
              },
              {
                conditions: [
                  {
                    fieldName: "description",
                    operator: "Contains",
                    values: [params.search]
                  }
                ],
                operator: ""
              }
            ]
          }
        ]
      }

      // Add status filtering if provided
      if (params.status && params.status !== 'all') {
        const statusCondition = {
          fieldName: "status",
          operator: "ExactMatch",
          values: [params.status]
        }
        
        if (queryParams.where) {
          queryParams.where.push(statusCondition)
        } else {
          queryParams.where = [statusCondition]
        }
      }

      // Add priority filtering if provided
      if (params.priority) {
        const priorityCondition = {
          fieldName: "priority",
          operator: "ExactMatch",
          values: [params.priority]
        }
        
        if (queryParams.where) {
          queryParams.where.push(priorityCondition)
        } else {
          queryParams.where = [priorityCondition]
        }
      }

      const response = await this.apperClient.fetchRecords(this.tableName, queryParams)
      
      if (!response || !response.data) {
        return []
      }

      // Transform the data to match frontend expectations
      return response.data.map(task => this.transformTaskFromAPI(task))
    } catch (error) {
      console.error("Error fetching tasks:", error)
      throw new Error("Failed to fetch tasks. Please try again.")
    }
  }

  // Get a single task by ID
  async getTaskById(taskId) {
    try {
      const params = {
        fields: this.allFields
      }

      const response = await this.apperClient.getRecordById(this.tableName, taskId, params)
      
      if (!response || !response.data) {
        return null
      }

      return this.transformTaskFromAPI(response.data)
    } catch (error) {
      console.error(`Error fetching task with ID ${taskId}:`, error)
      throw new Error("Failed to fetch task. Please try again.")
    }
  }

  // Create a new task
  async createTask(taskData) {
    try {
      // Filter to only include updateable fields and format data
      const formattedData = this.formatTaskForAPI(taskData)
      
      const params = {
        records: [formattedData]
      }

      const response = await this.apperClient.createRecord(this.tableName, params)
      
      if (response && response.success && response.results && response.results.length > 0) {
        const result = response.results[0]
        if (result.success) {
          return this.transformTaskFromAPI(result.data)
        } else {
          const errorMessage = result.errors ? 
            result.errors.map(err => `${err.fieldLabel}: ${err.message}`).join(', ') :
            result.message || "Failed to create task"
          throw new Error(errorMessage)
        }
      } else {
        throw new Error("Failed to create task")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      throw error
    }
  }

  // Update an existing task
  async updateTask(taskId, taskData) {
    try {
      // Filter to only include updateable fields and format data
      const formattedData = this.formatTaskForAPI(taskData)
      formattedData.Id = taskId
      
      const params = {
        records: [formattedData]
      }

      const response = await this.apperClient.updateRecord(this.tableName, params)
      
      if (response && response.success && response.results && response.results.length > 0) {
        const result = response.results[0]
        if (result.success) {
          return this.transformTaskFromAPI(result.data)
        } else {
          const errorMessage = result.message || "Failed to update task"
          throw new Error(errorMessage)
        }
      } else {
        throw new Error("Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      throw error
    }
  }

  // Delete a task
  async deleteTask(taskId) {
    try {
      const params = {
        RecordIds: [taskId]
      }

      const response = await this.apperClient.deleteRecord(this.tableName, params)
      
      if (response && response.success && response.results && response.results.length > 0) {
        const result = response.results[0]
        if (result.success) {
          return true
        } else {
          const errorMessage = result.message || "Failed to delete task"
          throw new Error(errorMessage)
        }
      } else {
        throw new Error("Failed to delete task")
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      throw error
    }
  }

  // Transform task data from API format to frontend format
  transformTaskFromAPI(apiTask) {
    return {
      id: apiTask.Id || apiTask.id,
      title: apiTask.title || '',
      description: apiTask.description || '',
      priority: apiTask.priority || 'medium',
      status: apiTask.status || 'pending',
      dueDate: apiTask.due_date || '',
      createdAt: apiTask.created_at || apiTask.CreatedOn || new Date().toISOString(),
      updatedAt: apiTask.updated_at || apiTask.ModifiedOn || new Date().toISOString(),
      completedAt: apiTask.completed_at || null,
      name: apiTask.Name || '',
      tags: apiTask.Tags || '',
      owner: apiTask.Owner || ''
    }
  }

  // Format task data for API submission
  formatTaskForAPI(frontendTask) {
    const apiTask = {}
    
    // Only include updateable fields
    if (frontendTask.title !== undefined) apiTask.title = frontendTask.title
    if (frontendTask.description !== undefined) apiTask.description = frontendTask.description
    if (frontendTask.priority !== undefined) apiTask.priority = frontendTask.priority
    if (frontendTask.status !== undefined) apiTask.status = frontendTask.status
    if (frontendTask.dueDate !== undefined) apiTask.due_date = frontendTask.dueDate
    if (frontendTask.name !== undefined) apiTask.Name = frontendTask.name || frontendTask.title
    if (frontendTask.tags !== undefined) apiTask.Tags = frontendTask.tags
    
    // Handle datetime fields - ensure proper ISO format
    apiTask.created_at = frontendTask.createdAt || new Date().toISOString()
    apiTask.updated_at = new Date().toISOString()
    
    if (frontendTask.completedAt) {
      apiTask.completed_at = frontendTask.completedAt
    } else if (frontendTask.status === 'completed') {
      apiTask.completed_at = new Date().toISOString()
    }

    return apiTask
  }
}

// Export a singleton instance
const taskService = new TaskService()
export default taskService