// Configuration Supabase
const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Identifiant unique pour la session utilisateur
const sessionId = 'user_' + Math.random().toString(36).substring(2, 15);
let currentChart = null;

function openMain() {
    console.log("Compass clicked!");
}

// Communication functions with WebTranslator
function sendNextOp(operationName) {
    console.log("Sending operation: " + operationName);
    window.parent.postMessage(JSON.stringify({ action: "nextOperation", actor: operationName }), "*");
}

function sendResetOp(operationName) {
    console.log("Resetting operation: " + operationName);
    window.parent.postMessage(JSON.stringify({ action: "resetOperation", actor: operationName }), "*");
}

function sendPlayOp(operationName) {
    console.log("Playing operation: " + operationName);
    window.parent.postMessage(JSON.stringify({ action: "playOperation", actor: operationName }), "*");
}

function sendRemoveOp(operationName) {
    console.log("Removing operation: " + operationName);
    window.parent.postMessage(JSON.stringify({ action: "removeOperation", actor: operationName }), "*");
}

document.addEventListener('DOMContentLoaded', (event) => {
    let currentStepIndex = 0;
    const steps = document.querySelectorAll('.process-step');
    const stepStatuses = Array(steps.length).fill(false);
    const stepTimes = Array(steps.length).fill(0);
    let startTimes = Array(steps.length).fill(null);
    let globalStartTime = null;
    let timerInterval = null;
    let isTimerRunning = false;
    let statsHistory = [];

    const timerButton = document.getElementById('timerButton');
    const globalTimerDisplay = document.getElementById('globalTimer');
    const statsPanel = document.getElementById('statsPanel');
    const showHistoryButton = document.getElementById('showHistoryButton');
    const historyPanel = document.getElementById('historyPanel');
    const processStepsContainer = document.querySelector('.process-steps');

    // Écoute des messages de changement d'opération
    window.addEventListener('message', function(event) {
        try {
            const msg = JSON.parse(event.data);
            if (msg.action === "operationChange") {
                const nextOpParts = msg.nextOp.split(" - ");
                const stepNumber = nextOpParts[0];
                const stepTitle = nextOpParts[1];
                
                const indicator = document.querySelector('.current-step-indicator');
                if (indicator) {
                    indicator.querySelector('.step-number').textContent = `Step ${stepNumber}`;
                    indicator.querySelector('.step-title').textContent = stepTitle;
                }

                const steps = document.querySelectorAll('.process-step');
                steps.forEach((step) => {
                    const currentStepNumber = step.querySelector('.process-number').textContent.trim();
                    if (parseInt(currentStepNumber) < parseInt(stepNumber)) {
                        step.classList.add('highlighted');
                    } else if (parseInt(currentStepNumber) === parseInt(stepNumber)) {
                        step.classList.remove('highlighted');
                    }
                });
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    // Timer formatting function
    function formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Show history button click handler
    showHistoryButton.addEventListener('click', async () => {
        statsPanel.classList.remove('visible');
        historyPanel.classList.toggle('visible');
        
        if (historyPanel.classList.contains('visible')) {
            processStepsContainer.style.display = 'none';
            await updateChart();
        } else {
            processStepsContainer.style.display = 'block';
        }
    });

    // Update all timers
    function updateTimers() {
        if (!isTimerRunning) return;

        const now = Date.now();
        
        // Update global timer
        if (globalStartTime) {
            globalTimerDisplay.textContent = formatTime(now - globalStartTime);
        }

        // Update current step timer
        const currentStep = Array.from(steps).find((step, index) => !stepStatuses[index]);
        if (currentStep) {
            const currentIndex = Array.from(steps).indexOf(currentStep);
            const timerDisplay = currentStep.querySelector('.timer-display');
            if (timerDisplay && startTimes[currentIndex]) {
                const elapsedTime = stepTimes[currentIndex] + (now - startTimes[currentIndex]);
                timerDisplay.textContent = formatTime(elapsedTime);
            }
        }
    }

    // Timer button click handler
    timerButton.addEventListener('click', async () => {
        if (!isTimerRunning) {
            // Start timer
            isTimerRunning = true;
            globalStartTime = Date.now();
            timerButton.textContent = 'Stop Timer';
            timerButton.classList.add('running');
            timerInterval = setInterval(updateTimers, 100);
            statsPanel.classList.remove('visible');
            historyPanel.classList.remove('visible');
            processStepsContainer.style.display = 'block';

            // Reset step times and statuses for new session
            stepTimes.fill(0);
            stepStatuses.fill(false);
            startTimes.fill(null);
            steps.forEach(step => {
                step.querySelector('.timer-display').textContent = '00:00:00';
                step.classList.remove('highlighted');
            });

            // Start timing the first step
            startTimes[0] = Date.now();
            
            // Créer une nouvelle session dans Supabase
            try {
                const { data, error } = await supabaseClient
                    .from('process_sessions')
                    .insert([{
                        session_id: sessionId,
                        status: 'running',
                        start_time: new Date().toISOString()
                    }])
                    .select();
                
                if (error) throw error;
                
                // Initialiser l'état des étapes dans Supabase
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const title = step.querySelector('.process-title').textContent;
                    const stepNumber = step.querySelector('.process-number').textContent.trim();
                    
                    await supabaseClient
                        .from('step_status')
                        .insert([{
                            session_id: sessionId,
                            step_number: parseInt(stepNumber),
                            step_name: title,
                            status: 'pending',
                            timestamp: new Date().toISOString()
                        }]);
                }
            } catch (error) {
                console.error('Error creating session in Supabase:', error);
            }
            
        } else {
            // Stop timer and show statistics
            isTimerRunning = false;
            clearInterval(timerInterval);
            timerButton.textContent = 'Start Timer';
            timerButton.classList.remove('running');
            
            // Save time for current step if any
            const currentStep = Array.from(steps).find((step, index) => !stepStatuses[index]);
            if (currentStep) {
                const currentIndex = Array.from(steps).indexOf(currentStep);
                if (startTimes[currentIndex]) {
                    stepTimes[currentIndex] += Date.now() - startTimes[currentIndex];
                    startTimes[currentIndex] = null;
                }
            }
            
            // Mettre à jour le statut de la session dans Supabase
            try {
                const { error } = await supabaseClient
                    .from('process_sessions')
                    .update({ status: 'completed', end_time: new Date().toISOString() })
                    .eq('session_id', sessionId);
                
                if (error) throw error;
            } catch (error) {
                console.error('Error updating session in Supabase:', error);
            }
            
            showStatistics();
        }
    });

    // Show statistics panel
    async function showStatistics() {
        const stepStats = document.getElementById('stepStats');
        const totalTime = document.getElementById('totalTime');
        stepStats.innerHTML = '';

        let totalMs = 0;

        // Pour chaque étape, sauvegarder dans Supabase
        for (let index = 0; index < steps.length; index++) {
            const step = steps[index];
            const title = step.querySelector('.process-title').textContent;
            const time = stepTimes[index];
            totalMs += time;

            const stepDiv = document.createElement('div');
            stepDiv.innerHTML = `<span>${title}</span><span>${formatTime(time)}</span>`;
            stepStats.appendChild(stepDiv);

            // Sauvegarder dans Supabase
            try {
                const { error } = await supabaseClient
                    .from('operation_times')
                    .insert([{
                        operation_number: index + 1,
                        operation_name: title,
                        time_taken: time
                    }]);

                if (error) throw error;
            } catch (error) {
                console.error('Error saving to Supabase:', error);
            }
        }

        totalTime.textContent = `Total Time: ${formatTime(totalMs)}`;
        statsPanel.classList.add('visible');
    }

    // Next operation handler
    window.nextOp = async function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);
        const stepNumber = processStep.querySelector('.process-number').textContent.trim();
        const stepTitle = processStep.querySelector('.process-title').textContent.trim();

        if (stepStatuses.slice(0, stepIndex).every(status => status)) {
            if (isTimerRunning && startTimes[stepIndex]) {
                // Save completion time for current step
                stepTimes[stepIndex] += Date.now() - startTimes[stepIndex];
                startTimes[stepIndex] = null;

                // Start timing next step
                if (stepIndex + 1 < steps.length) {
                    startTimes[stepIndex + 1] = Date.now();
                }
            }

            stepStatuses[stepIndex] = true;
            const operationName = getOperationName(processStep);
            sendNextOp(operationName);
            highlightSteps();
            
            // Enregistrer l'action dans Supabase pour synchronisation
            try {
                const { data, error } = await supabaseClient
                    .from('step_actions')
                    .insert([{
                        session_id: sessionId,
                        step_number: parseInt(stepNumber),
                        step_name: stepTitle,
                        action: 'validate',
                        timestamp: new Date().toISOString()
                    }])
                    .select();
                
                if (error) throw error;
                
                // Mettre à jour le statut de l'étape
                await updateStepStatus(parseInt(stepNumber), 'completed');
            } catch (error) {
                console.error('Error saving step action to Supabase:', error);
            }
        }
    };

    // Reset operation handler
    window.resetOp = async function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);
        const stepNumber = processStep.querySelector('.process-number').textContent.trim();
        const stepTitle = processStep.querySelector('.process-title').textContent.trim();

        if (isTimerRunning) {
            startTimes[stepIndex] = null;
            stepTimes[stepIndex] = 0;
            
            // Reset all subsequent steps
            for (let i = stepIndex + 1; i < steps.length; i++) {
                startTimes[i] = null;
                stepTimes[i] = 0;
                const timerDisplay = steps[i].querySelector('.timer-display');
                if (timerDisplay) {
                    timerDisplay.textContent = '00:00:00';
                }
            }

            // Start timing the reset step
            startTimes[stepIndex] = Date.now();
        }

        stepStatuses[stepIndex] = false;
        const operationName = getOperationName(processStep);
        sendResetOp(operationName);
        highlightSteps();

        // Reset subsequent steps
        for (let i = stepIndex + 1; i < steps.length; i++) {
            stepStatuses[i] = false;
            const nextStepOperation = getOperationName(steps[i]);
            sendRemoveOp(nextStepOperation);
        }
        
        // Enregistrer l'action dans Supabase pour synchronisation
        try {
            const { data, error } = await supabaseClient
                .from('step_actions')
                .insert([{
                    session_id: sessionId,
                    step_number: parseInt(stepNumber),
                    step_name: stepTitle,
                    action: 'reset',
                    timestamp: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            
            // Mettre à jour le statut de l'étape et des étapes suivantes
            await updateStepStatus(parseInt(stepNumber), 'pending');
            for (let i = stepIndex + 1; i < steps.length; i++) {
                const nextNumber = steps[i].querySelector('.process-number').textContent.trim();
                await updateStepStatus(parseInt(nextNumber), 'pending');
            }
        } catch (error) {
            console.error('Error saving step action to Supabase:', error);
        }
    };

    // Mettre à jour le statut d'une étape dans Supabase
    async function updateStepStatus(stepNumber, status) {
        try {
            const { error } = await supabaseClient
                .from('step_status')
                .update({ status: status, timestamp: new Date().toISOString() })
                .eq('session_id', sessionId)
                .eq('step_number', stepNumber);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error updating step status in Supabase:', error);
        }
    }

    // Get operation name helper
    function getOperationName(processStep) {
        const stepNumber = processStep.querySelector('.process-number').textContent.trim();
        const processTitle = processStep.querySelector('.process-title').textContent.trim();
        return `${stepNumber} - ${processTitle}`;
    }

    // Highlight steps helper
    function highlightSteps() {
        steps.forEach((step, idx) => {
            if (stepStatuses[idx]) {
                step.classList.add('highlighted');
            } else {
                step.classList.remove('highlighted');
            }
        });
    }

    // Fonction pour mettre à jour le graphique
    async function updateChart() {
        try {
            // Récupérer les données de Supabase
            const { data, error } = await supabaseClient
                .from('operation_times')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;

            // Grouper les données par opération
            const groupedData = {};
            data.forEach(record => {
                if (!groupedData[record.operation_number]) {
                    groupedData[record.operation_number] = [];
                }
                if (groupedData[record.operation_number].length < 5) {
                    groupedData[record.operation_number].push(record);
                }
            });

            const canvas = document.getElementById('statsChart');
            
            if (currentChart) {
                currentChart.destroy();
            }

            const datasets = Object.entries(groupedData).map(([opNum, times], index) => ({
                label: times[0].operation_name,
                data: times.map(t => t.time_taken / 1000).reverse(),
                backgroundColor: [
                    'rgba(0, 83, 134, 0.7)',   // Major-Color-DarkBlue
                    'rgba(29, 169, 255, 0.7)',  // Major-Color-LightBlue
                    'rgba(200, 211, 0, 0.7)',   // Biovia-Medidata-green
                    'rgba(232, 119, 34, 0.7)',  // Enovia-Netvibes-Orange
                    'rgba(218, 41, 28, 0.7)',   // SolidWorks-Red
                    'rgba(0, 150, 136, 0.7)',
                    'rgba(156, 39, 176, 0.7)',
                    'rgba(33, 150, 243, 0.7)'
                ][index % 8]
            }));

            currentChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: ['5e dernier', '4e dernier', '3e dernier', '2e dernier', 'Dernier'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Temps (secondes)'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    // S'abonner aux changements de statut des étapes
    async function subscribeToStepActions() {
        try {
            const subscription = supabaseClient
                .channel('step-actions-channel')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'step_actions' 
                    }, 
                    handleStepAction)
                .subscribe();
                
            console.log('Subscribed to step actions');
        } catch (error) {
            console.error('Error subscribing to step actions:', error);
        }
    }

    // Gérer les actions d'étapes venant d'autres utilisateurs
    function handleStepAction(payload) {
        const { new: stepAction } = payload;
        
        // Ignorer les actions provenant de cette session
        if (stepAction.session_id === sessionId) return;
        
        console.log('Received step action:', stepAction);
        
        const stepNumber = stepAction.step_number;
        const action = stepAction.action;
        
        // Trouver l'élément correspondant
        const targetStep = Array.from(steps).find(step => {
            const currentStepNumber = parseInt(step.querySelector('.process-number').textContent.trim());
            return currentStepNumber === stepNumber;
        });
        
        if (!targetStep) return;
        
        const stepIndex = Array.from(steps).indexOf(targetStep);
        
        // Appliquer l'action synchronisée localement
        if (action === 'validate') {
            // Synchroniser la validation d'étape
            stepStatuses[stepIndex] = true;
            highlightSteps();
            
            // Notification visuelle
            targetStep.style.transition = 'background-color 0.5s';
            targetStep.style.backgroundColor = 'rgba(200, 211, 0, 0.3)';
            setTimeout(() => {
                targetStep.style.backgroundColor = '';
            }, 1000);
            
        } else if (action === 'reset') {
            // Synchroniser la réinitialisation d'étape
            stepStatuses[stepIndex] = false;
            
            // Réinitialiser aussi les étapes suivantes
            for (let i = stepIndex + 1; i < steps.length; i++) {
                stepStatuses[i] = false;
            }
            
            highlightSteps();
            
            // Notification visuelle
            targetStep.style.transition = 'background-color 0.5s';
            targetStep.style.backgroundColor = 'rgba(218, 41, 28, 0.3)';
            setTimeout(() => {
                targetStep.style.backgroundColor = '';
            }, 1000);
        }
    }

    // Initialize step highlighting
    highlightSteps();
    
    // S'abonner aux mises à jour en temps réel
    subscribeToStepActions();
});