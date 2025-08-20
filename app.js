class FitnessTracker {
    constructor() {
        this.sessions = this.loadSessions();
        this.currentSession = null;
        this.chart = null;
        this.currentPage = 1;
        this.sessionsPerPage = 5;
        this.currentTab = 'history';
        this.initializeApp();
    }

    initializeApp() {
        this.setCurrentDateTime();
        this.setupEventListeners();
        this.updateChartExerciseOptions();
        this.displaySessionHistory();
        this.updateSessionStatus();
    }

    setCurrentDateTime() {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('sessionStartTime').value = localDateTime;
    }

    setupEventListeners() {
        document.getElementById('startSessionBtn').addEventListener('click', () => {
            this.toggleSession();
        });

        document.getElementById('addExerciseBtn').addEventListener('click', () => {
            this.addExerciseToSession();
        });

        document.getElementById('sessionFilter').addEventListener('change', () => {
            this.currentPage = 1; // Reset to first page when filter changes
            this.displaySessionHistory();
        });

        document.getElementById('chartExercise').addEventListener('change', () => {
            this.updateProgressChart();
        });

        document.getElementById('chartMetric').addEventListener('change', () => {
            this.updateProgressChart();
        });

        document.getElementById('customExercise').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addExerciseToSession();
            }
        });

        // Add listeners for datetime changes during active session
        document.addEventListener('change', (e) => {
            if ((e.target.id === 'sessionStartTime' || e.target.id === 'sessionEndTime') && this.currentSession) {
                this.updateSessionTimes();
            }
        });

        // Tab navigation listeners
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

    }

    loadSessions() {
        const stored = localStorage.getItem('fitnessTrackerSessions');
        return stored ? JSON.parse(stored) : [];
    }

    saveSessions() {
        localStorage.setItem('fitnessTrackerSessions', JSON.stringify(this.sessions));
    }

    toggleSession() {
        if (this.currentSession) {
            this.endSession();
        } else {
            this.startSession();
        }
    }

    startSession() {
        const bodyWeight = parseFloat(document.getElementById('bodyWeight').value) || null;
        const startTime = document.getElementById('sessionStartTime').value;
        const endTime = document.getElementById('sessionEndTime').value;

        if (!startTime) {
            alert('Please select a start time for your workout');
            return;
        }

        this.currentSession = {
            id: Date.now(),
            date: startTime.split('T')[0], // Extract date for compatibility
            bodyWeight: bodyWeight,
            startTime: new Date(startTime).toISOString(),
            endTime: endTime ? new Date(endTime).toISOString() : null,
            exercises: []
        };

        this.updateSessionStatus();
        this.showSuccessMessage('Workout session started!');
    }

    endSession() {
        if (!this.currentSession) return;

        const endTime = document.getElementById('sessionEndTime').value;
        if (!endTime) {
            alert('Please set an end time before ending the session');
            return;
        }
        
        this.currentSession.endTime = new Date(endTime).toISOString();
        this.sessions.push(this.currentSession);
        this.saveSessions();
        
        const duration = this.getSessionDuration(this.currentSession);
        this.showSuccessMessage(`Workout completed! Duration: ${duration}`);
        
        this.currentSession = null;
        this.updateSessionStatus();
        this.updateChartExerciseOptions();
        this.displaySessionHistory();
    }

    updateSessionTimes() {
        if (!this.currentSession) return;

        const startTime = document.getElementById('sessionStartTime').value;
        const endTime = document.getElementById('sessionEndTime').value;

        if (startTime) {
            this.currentSession.startTime = new Date(startTime).toISOString();
            this.currentSession.date = startTime.split('T')[0];
        }

        if (endTime) {
            this.currentSession.endTime = new Date(endTime).toISOString();
        } else {
            this.currentSession.endTime = null;
        }

        this.updateSessionStatus();
    }

    stopSession() {
        if (!this.currentSession) return;

        // Set current time as end time
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('sessionEndTime').value = localDateTime;
        
        // Update the session
        this.updateSessionTimes();
        
        this.showSuccessMessage('Session stopped! You can still adjust times before saving.');
    }

    updateSessionStatus() {
        const statusDiv = document.getElementById('sessionStatus');
        const exerciseSection = document.getElementById('exerciseSection');
        const startBtn = document.getElementById('startSessionBtn');

        if (this.currentSession) {
            statusDiv.className = 'session-active';
            
            // Convert times back to local datetime format for the inputs
            const startTimeLocal = new Date(this.currentSession.startTime).toISOString().slice(0, 16);
            const endTimeLocal = this.currentSession.endTime ? new Date(this.currentSession.endTime).toISOString().slice(0, 16) : '';
            
            const duration = this.currentSession.endTime ? this.getSessionDuration(this.currentSession) : 'Ongoing';
            
            statusDiv.innerHTML = `
                <div class="active-session">
                    <h3>🔥 Active Workout Session</h3>
                    <div class="session-time-controls">
                        <div class="form-group">
                            <label for="bodyWeight">Body Weight (kg):</label>
                            <input type="number" id="bodyWeight" min="0" step="0.1" value="${this.currentSession.bodyWeight || ''}" placeholder="70">
                        </div>
                        <div class="form-group">
                            <label for="sessionStartTime">Start Time:</label>
                            <input type="datetime-local" id="sessionStartTime" value="${startTimeLocal}" required>
                        </div>
                        <div class="form-group">
                            <label for="sessionEndTime">End Time:</label>
                            <input type="datetime-local" id="sessionEndTime" value="${endTimeLocal}">
                        </div>
                    </div>
                    <p><strong>Duration:</strong> ${duration}</p>
                    <div class="session-buttons">
                        <button id="stopSessionBtn" class="stop-btn">Stop Now</button>
                        ${this.currentSession.endTime ? '<button id="endSessionBtn" class="end-btn">Save & End Session</button>' : ''}
                    </div>
                </div>
            `;
            exerciseSection.style.display = 'block';
            
            // Add event listeners for session buttons
            document.getElementById('stopSessionBtn').addEventListener('click', () => {
                this.stopSession();
            });
            
            const endBtn = document.getElementById('endSessionBtn');
            if (endBtn) {
                endBtn.addEventListener('click', () => {
                    this.endSession();
                });
            }
        } else {
            statusDiv.className = 'session-inactive';
            statusDiv.innerHTML = `
                <div class="session-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="bodyWeight">Body Weight (kg):</label>
                            <input type="number" id="bodyWeight" min="0" step="0.1" placeholder="70">
                        </div>
                        <div class="form-group">
                            <label for="sessionStartTime">Start Time:</label>
                            <input type="datetime-local" id="sessionStartTime" required>
                        </div>
                        <div class="form-group">
                            <label for="sessionEndTime">End Time:</label>
                            <input type="datetime-local" id="sessionEndTime">
                        </div>
                    </div>
                    <button id="startSessionBtn" class="start-btn">Start Workout</button>
                </div>
            `;
            exerciseSection.style.display = 'none';
            this.setCurrentDateTime();
            
            document.getElementById('startSessionBtn').addEventListener('click', () => {
                this.toggleSession();
            });
        }
        
        this.displayCurrentExercises();
    }

    addExerciseToSession() {
        if (!this.currentSession) {
            alert('Please start a workout session first');
            return;
        }

        const exerciseSelect = document.getElementById('exerciseSelect');
        const customExercise = document.getElementById('customExercise');
        const exerciseName = customExercise.value.trim() || exerciseSelect.value;

        if (!exerciseName) {
            alert('Please select or enter an exercise name');
            return;
        }

        const exercise = {
            id: Date.now(),
            name: exerciseName,
            sets: []
        };

        this.currentSession.exercises.push(exercise);
        
        exerciseSelect.value = '';
        customExercise.value = '';
        
        this.displayCurrentExercises();
        this.showSuccessMessage(`${exerciseName} added to session`);
    }

    displayCurrentExercises() {
        const container = document.getElementById('currentExercises');
        
        if (!this.currentSession || this.currentSession.exercises.length === 0) {
            container.innerHTML = '<p class="no-data">No exercises in current session</p>';
            return;
        }

        const exercisesHTML = this.currentSession.exercises.map(exercise => {
            const setsHTML = exercise.sets.map((set, index) => `
                <div class="set-entry">
                    <span>Set ${index + 1}: ${set.reps} reps @ ${set.weight} kg</span>
                    <button class="remove-btn" data-action="remove-set" data-exercise-id="${exercise.id}" data-set-index="${index}">×</button>
                </div>
            `).join('');

            return `
                <div class="exercise-block">
                    <div class="exercise-header">
                        <h3>${exercise.name}</h3>
                        <button class="remove-btn" data-action="remove-exercise" data-exercise-id="${exercise.id}">Remove Exercise</button>
                    </div>
                    <div class="sets-container">
                        ${setsHTML}
                    </div>
                    <div class="add-set-form">
                        <input type="number" placeholder="Reps" min="1" id="reps-${exercise.id}" class="set-input">
                        <input type="number" placeholder="Weight (kg)" min="0" step="0.5" id="weight-${exercise.id}" class="set-input">
                        <button class="add-set-btn" data-action="add-set" data-exercise-id="${exercise.id}">Add Set</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = exercisesHTML;
        
        // Add event listeners for the dynamically created buttons
        container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const exerciseId = e.target.dataset.exerciseId;
                
                switch (action) {
                    case 'add-set':
                        this.addSet(exerciseId);
                        break;
                    case 'remove-set':
                        const setIndex = parseInt(e.target.dataset.setIndex);
                        this.removeSet(exerciseId, setIndex);
                        break;
                    case 'remove-exercise':
                        this.removeExercise(exerciseId);
                        break;
                }
            });
        });
    }

    addSet(exerciseId) {
        const exercise = this.currentSession.exercises.find(ex => ex.id == exerciseId);
        if (!exercise) return;

        const reps = parseInt(document.getElementById(`reps-${exerciseId}`).value);
        const weight = parseFloat(document.getElementById(`weight-${exerciseId}`).value);

        if (!reps || reps < 1 || weight < 0) {
            alert('Please enter valid reps and weight');
            return;
        }

        const set = {
            reps: reps,
            weight: weight,
            timestamp: new Date().toISOString()
        };

        exercise.sets.push(set);
        
        document.getElementById(`reps-${exerciseId}`).value = '';
        document.getElementById(`weight-${exerciseId}`).value = '';
        
        this.displayCurrentExercises();
    }

    removeSet(exerciseId, setIndex) {
        const exercise = this.currentSession.exercises.find(ex => ex.id == exerciseId);
        if (!exercise) return;

        exercise.sets.splice(setIndex, 1);
        this.displayCurrentExercises();
    }

    removeExercise(exerciseId) {
        if (!confirm('Remove this exercise from the session?')) return;
        
        this.currentSession.exercises = this.currentSession.exercises.filter(ex => ex.id != exerciseId);
        this.displayCurrentExercises();
    }

    calculateOneRepMax(weight, reps) {
        return Math.round(weight * (1 + reps / 30) * 10) / 10;
    }

    showSuccessMessage(message) {
        const existingMessage = document.querySelector('.success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;
        
        document.querySelector('.container').insertBefore(messageDiv, document.querySelector('main'));

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    updateChartExerciseOptions() {
        const allExercises = [];
        this.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (exercise.sets.length > 0 && !allExercises.includes(exercise.name)) {
                    allExercises.push(exercise.name);
                }
            });
        });

        const chartSelect = document.getElementById('chartExercise');
        chartSelect.innerHTML = '<option value="">Select Exercise</option>';
        
        allExercises.sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            chartSelect.appendChild(option);
        });
    }

    getSessionDuration(session) {
        if (!session.endTime) return 'Ongoing';
        
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        
        if (diffMins < 60) {
            return `${diffMins} minutes`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    }

    displaySessionHistory() {
        const filterDays = parseInt(document.getElementById('sessionFilter').value) || null;
        let filteredSessions = [...this.sessions];

        if (filterDays) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filterDays);
            filteredSessions = filteredSessions.filter(session => 
                new Date(session.date) >= cutoffDate
            );
        }

        const sortedSessions = filteredSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const historyDiv = document.getElementById('sessionHistoryList');

        if (sortedSessions.length === 0) {
            historyDiv.innerHTML = '<p class="no-data">No workout sessions found</p>';
            return;
        }

        // Calculate pagination
        const totalSessions = sortedSessions.length;
        const totalPages = Math.ceil(totalSessions / this.sessionsPerPage);
        const startIndex = (this.currentPage - 1) * this.sessionsPerPage;
        const endIndex = startIndex + this.sessionsPerPage;
        const paginatedSessions = sortedSessions.slice(startIndex, endIndex);

        // Ensure current page is valid
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
            this.displaySessionHistory(); // Recursive call with corrected page
            return;
        }

        const historyHTML = paginatedSessions.map(session => {
            const duration = this.getSessionDuration(session);
            const exerciseCount = session.exercises.length;
            const totalSets = session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
            
            const exercisesHTML = session.exercises.map(exercise => {
                if (exercise.sets.length === 0) return '';
                
                const maxWeight = Math.max(...exercise.sets.map(set => set.weight));
                const totalVolume = exercise.sets.reduce((vol, set) => vol + (set.reps * set.weight), 0);
                const bestSet = exercise.sets.reduce((best, set) => 
                    this.calculateOneRepMax(set.weight, set.reps) > this.calculateOneRepMax(best.weight, best.reps) ? set : best
                );
                
                return `
                    <div class="session-exercise">
                        <h4>${exercise.name}</h4>
                        <div class="exercise-summary">
                            <span>${exercise.sets.length} sets</span>
                            <span>Max: ${maxWeight} kg</span>
                            <span>Volume: ${totalVolume} kg</span>
                            <span>Best: ${bestSet.reps} × ${bestSet.weight} kg</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="session-entry" data-session-id="${session.id}">
                    <div class="session-header">
                        <h3>${new Date(session.date).toLocaleDateString()}</h3>
                        <div class="session-stats">
                            <span>${duration}</span>
                            <span>${exerciseCount} exercises</span>
                            <span>${totalSets} sets</span>
                            ${session.bodyWeight ? `<span>${session.bodyWeight} kg</span>` : ''}
                        </div>
                        <button class="edit-session-btn" data-action="edit-session" data-session-id="${session.id}">Edit Times</button>
                    </div>
                    <div class="session-time-edit" id="edit-${session.id}" style="display: none;">
                        <div class="session-time-controls">
                            <div class="form-group">
                                <label>Start Time:</label>
                                <input type="datetime-local" id="edit-start-${session.id}" value="${new Date(session.startTime).toISOString().slice(0, 16)}">
                            </div>
                            <div class="form-group">
                                <label>End Time:</label>
                                <input type="datetime-local" id="edit-end-${session.id}" value="${session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : ''}">
                            </div>
                            <div class="form-group">
                                <label>Body Weight (kg):</label>
                                <input type="number" id="edit-weight-${session.id}" value="${session.bodyWeight || ''}" min="0" step="0.1">
                            </div>
                        </div>
                        <div class="edit-buttons">
                            <button class="save-btn" data-action="save-session" data-session-id="${session.id}">Save</button>
                            <button class="cancel-btn" data-action="cancel-edit" data-session-id="${session.id}">Cancel</button>
                        </div>
                    </div>
                    <div class="session-exercises">
                        ${exercisesHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Create pagination controls
        const paginationHTML = this.createPaginationControls(totalPages, this.currentPage, totalSessions);
        
        historyDiv.innerHTML = historyHTML + paginationHTML;
        
        // Add event listeners for edit buttons
        historyDiv.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const sessionId = e.target.dataset.sessionId;
                
                switch (action) {
                    case 'edit-session':
                        this.editSession(sessionId);
                        break;
                    case 'save-session':
                        this.saveSessionEdit(sessionId);
                        break;
                    case 'cancel-edit':
                        this.cancelSessionEdit(sessionId);
                        break;
                    case 'goto-page':
                        const page = parseInt(e.target.dataset.page);
                        this.goToPage(page);
                        break;
                    case 'prev-page':
                        this.goToPage(this.currentPage - 1);
                        break;
                    case 'next-page':
                        this.goToPage(this.currentPage + 1);
                        break;
                }
            });
        });
    }

    createPaginationControls(totalPages, currentPage, totalSessions) {
        if (totalPages <= 1) return '';

        const startSession = ((currentPage - 1) * this.sessionsPerPage) + 1;
        const endSession = Math.min(currentPage * this.sessionsPerPage, totalSessions);

        let paginationHTML = `
            <div class="pagination-container">
                <div class="pagination-info">
                    Showing ${startSession}-${endSession} of ${totalSessions} sessions
                </div>
                <div class="pagination-controls">
        `;

        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-action="prev-page">← Previous</button>`;
        }

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn page-btn ${isActive}" data-action="goto-page" data-page="${i}">${i}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" data-action="next-page">Next →</button>`;
        }

        paginationHTML += `
                </div>
            </div>
        `;

        return paginationHTML;
    }

    goToPage(page) {
        const filterDays = parseInt(document.getElementById('sessionFilter').value) || null;
        let filteredSessions = [...this.sessions];

        if (filterDays) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filterDays);
            filteredSessions = filteredSessions.filter(session => 
                new Date(session.date) >= cutoffDate
            );
        }

        const totalPages = Math.ceil(filteredSessions.length / this.sessionsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.displaySessionHistory();
        }
    }

    editSession(sessionId) {
        const editDiv = document.getElementById(`edit-${sessionId}`);
        const editBtn = document.querySelector(`[data-action="edit-session"][data-session-id="${sessionId}"]`);
        
        editDiv.style.display = 'block';
        editBtn.textContent = 'Editing...';
        editBtn.disabled = true;
    }

    cancelSessionEdit(sessionId) {
        const editDiv = document.getElementById(`edit-${sessionId}`);
        const editBtn = document.querySelector(`[data-action="edit-session"][data-session-id="${sessionId}"]`);
        
        editDiv.style.display = 'none';
        editBtn.textContent = 'Edit Times';
        editBtn.disabled = false;
        
        // Reset form values to original
        const session = this.sessions.find(s => s.id == sessionId);
        if (session) {
            document.getElementById(`edit-start-${sessionId}`).value = new Date(session.startTime).toISOString().slice(0, 16);
            document.getElementById(`edit-end-${sessionId}`).value = session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : '';
            document.getElementById(`edit-weight-${sessionId}`).value = session.bodyWeight || '';
        }
    }

    saveSessionEdit(sessionId) {
        const session = this.sessions.find(s => s.id == sessionId);
        if (!session) return;

        const startTime = document.getElementById(`edit-start-${sessionId}`).value;
        const endTime = document.getElementById(`edit-end-${sessionId}`).value;
        const bodyWeight = parseFloat(document.getElementById(`edit-weight-${sessionId}`).value) || null;

        if (!startTime) {
            alert('Start time is required');
            return;
        }

        // Update session
        session.startTime = new Date(startTime).toISOString();
        session.endTime = endTime ? new Date(endTime).toISOString() : null;
        session.date = startTime.split('T')[0]; // Update date from start time
        session.bodyWeight = bodyWeight;

        // Save to localStorage
        this.saveSessions();

        // Hide edit form
        this.cancelSessionEdit(sessionId);

        // Refresh displays
        this.displaySessionHistory();
        this.updateChartExerciseOptions();
        this.updateProgressChart();

        this.showSuccessMessage('Session updated successfully!');
    }

    // Tab Navigation Methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab pages
        document.querySelectorAll('.tab-page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(tabName + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentTab = tabName;

        // Refresh chart if switching to charts tab
        if (tabName === 'charts') {
            setTimeout(() => {
                this.updateProgressChart();
            }, 300);
        }
    }


    updateProgressChart() {
        const selectedExercise = document.getElementById('chartExercise').value;
        const selectedMetric = document.getElementById('chartMetric').value;
        
        if (!selectedExercise) {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            return;
        }

        const exerciseData = [];
        this.sessions.forEach(session => {
            const exercise = session.exercises.find(ex => ex.name === selectedExercise);
            if (exercise && exercise.sets.length > 0) {
                const sessionStats = this.calculateSessionStats(exercise, session.date);
                exerciseData.push(sessionStats);
            }
        });

        exerciseData.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (exerciseData.length === 0) return;

        const ctx = document.getElementById('progressChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = exerciseData.map(data => new Date(data.date).toLocaleDateString());
        let chartData, yAxisLabel;

        switch (selectedMetric) {
            case 'maxWeight':
                chartData = exerciseData.map(data => data.maxWeight);
                yAxisLabel = 'Max Weight (kg)';
                break;
            case 'totalVolume':
                chartData = exerciseData.map(data => data.totalVolume);
                yAxisLabel = 'Total Volume (kg)';
                break;
            case 'progressiveOverload':
                chartData = exerciseData.map((data, index) => {
                    if (index === 0) return 0; // First session has no baseline
                    return this.calculateProgressiveOverload(exerciseData, index, selectedExercise);
                });
                yAxisLabel = 'Progressive Overload Score';
                break;
            default:
                chartData = exerciseData.map(data => data.maxWeight);
                yAxisLabel = 'Max Weight (kg)';
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: yAxisLabel,
                    data: chartData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.1,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#667eea',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: yAxisLabel
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const sessionData = exerciseData[dataIndex];
                                return [
                                    `Sets: ${sessionData.totalSets}`,
                                    `Max Weight: ${sessionData.maxWeight} kg`,
                                    `Total Volume: ${sessionData.totalVolume} kg`,
                                    `Progressive Overload: ${sessionData.progressiveOverload || 'N/A'}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    calculateSessionStats(exercise, date) {
        const sets = exercise.sets;
        const maxWeight = Math.max(...sets.map(set => set.weight));
        const totalVolume = sets.reduce((vol, set) => vol + (set.reps * set.weight), 0);
        const bestSet = sets.reduce((best, set) => 
            this.calculateOneRepMax(set.weight, set.reps) > this.calculateOneRepMax(best.weight, best.reps) ? set : best
        );
        const estimatedOneRM = this.calculateOneRepMax(bestSet.weight, bestSet.reps);

        return {
            date: date,
            maxWeight: maxWeight,
            totalVolume: totalVolume,
            estimatedOneRM: estimatedOneRM,
            totalSets: sets.length,
            bestSet: bestSet,
            sets: sets
        };
    }

    calculateProgressiveOverload(exerciseData, currentIndex, exerciseName) {
        const currentSession = exerciseData[currentIndex];
        const previousSession = exerciseData[currentIndex - 1];
        
        if (!currentSession || !previousSession) return 0;

        let overloadScore = 0;
        
        // Compare each set from current session with previous session sets
        currentSession.sets.forEach((currentSet, setIndex) => {
            // Look for comparable sets in previous session (same set number or similar)
            const previousSet = previousSession.sets[setIndex] || 
                               previousSession.sets.find(ps => Math.abs(ps.weight - currentSet.weight) <= 2.5);
            
            if (previousSet) {
                // Rule 1: Same weight, more reps = progressive overload
                if (currentSet.weight === previousSet.weight && currentSet.reps > previousSet.reps) {
                    overloadScore += (currentSet.reps - previousSet.reps) * 0.5;
                }
                
                // Rule 2: Higher weight with reps within 3 of previous = progressive overload
                if (currentSet.weight > previousSet.weight && 
                    currentSet.reps >= (previousSet.reps - 3)) {
                    const weightIncrease = currentSet.weight - previousSet.weight;
                    const repsPenalty = Math.max(0, previousSet.reps - currentSet.reps) * 0.2;
                    overloadScore += weightIncrease - repsPenalty;
                }
            }
        });
        
        return Math.round(overloadScore * 10) / 10; // Round to 1 decimal place
    }

    getProgressiveOverloadIndicator(currentSessionData, previousSessionData, exerciseName) {
        if (!previousSessionData) {
            return { class: 'first-time', text: 'First Time' };
        }

        const overloadScore = this.calculateProgressiveOverload(
            [previousSessionData, currentSessionData], 
            1, 
            exerciseName
        );

        if (overloadScore > 0) {
            return { class: 'progress', text: `Progressive Overload (+${overloadScore})` };
        } else if (overloadScore === 0) {
            return { class: 'maintenance', text: 'Maintenance' };
        } else {
            return { class: 'regression', text: 'Regression' };
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FitnessTracker();
});