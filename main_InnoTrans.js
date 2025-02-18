// Configuration Supabase
const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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

    const timerButton = document.getElementById('timerButton');
    const globalTimerDisplay = document.getElementById('globalTimer');
    const statsPanel = document.getElementById('statsPanel');
    const showHistoryButton = document.getElementById('showHistoryButton');
    const historyPanel = document.getElementById('historyPanel');
    const processStepsContainer = document.querySelector('.process-steps');

    // Timer formatting function
    function formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Update all timers
    function updateTimers() {
        if (!isTimerRunning) return;

        const now = Date.now();
        
        if (globalStartTime) {
            globalTimerDisplay.textContent = formatTime(now - globalStartTime);
        }

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

    // Timer button click handler
    timerButton.addEventListener('click', () => {
        if (!isTimerRunning) {
            isTimerRunning = true;
            globalStartTime = Date.now();
            timerButton.textContent = 'Stop Timer';
            timerButton.classList.add('running');
            timerInterval = setInterval(updateTimers, 100);
            statsPanel.classList.remove('visible');
            historyPanel.classList.remove('visible');
            processStepsContainer.style.display = 'block';

            stepTimes.fill(0);
            stepStatuses.fill(false);
            startTimes.fill(null);
            steps.forEach(step => {
                step.querySelector('.timer-display').textContent = '00:00:00';
                step.classList.remove('highlighted');
            });

            startTimes[0] = Date.now();
            
        } else {
            isTimerRunning = false;
            clearInterval(timerInterval);
            timerButton.textContent = 'Start Timer';
            timerButton.classList.remove('running');
            
            const currentStep = Array.from(steps).find((step, index) => !stepStatuses[index]);
            if (currentStep) {
                const currentIndex = Array.from(steps).indexOf(currentStep);
                if (startTimes[currentIndex]) {
                    stepTimes[currentIndex] += Date.now() - startTimes[currentIndex];
                    startTimes[currentIndex] = null;
                }
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
                        time_taken: time,
                        total_time: totalMs
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
    window.nextOp = function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);

        if (stepStatuses.slice(0, stepIndex).every(status => status)) {
            if (isTimerRunning && startTimes[stepIndex]) {
                stepTimes[stepIndex] += Date.now() - startTimes[stepIndex];
                startTimes[stepIndex] = null;

                if (stepIndex + 1 < steps.length) {
                    startTimes[stepIndex + 1] = Date.now();
                }
            }

            stepStatuses[stepIndex] = true;
            const operationName = getOperationName(processStep);
            sendNextOp(operationName);
            highlightSteps();
        }
    };

    // Reset operation handler
    window.resetOp = function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);

        if (isTimerRunning) {
            startTimes[stepIndex] = null;
            stepTimes[stepIndex] = 0;
            
            for (let i = stepIndex + 1; i < steps.length; i++) {
                startTimes[i] = null;
                stepTimes[i] = 0;
                const timerDisplay = steps[i].querySelector('.timer-display');
                if (timerDisplay) {
                    timerDisplay.textContent = '00:00:00';
                }
            }

            startTimes[stepIndex] = Date.now();
        }

        stepStatuses[stepIndex] = false;
        const operationName = getOperationName(processStep);
        sendResetOp(operationName);
        highlightSteps();

        for (let i = stepIndex + 1; i < steps.length; i++) {
            stepStatuses[i] = false;
            const nextStepOperation = getOperationName(steps[i]);
            sendRemoveOp(nextStepOperation);
        }
    };

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

    async function updateChart() {
        try {
            const { data, error } = await supabaseClient
                .from('operation_times')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;

            // Grouper les données par session (timestamp)
            const sessionData = {};
            data.forEach(record => {
                const timestamp = record.timestamp.split('T')[0]; // Grouper par jour
                if (!sessionData[timestamp]) {
                    sessionData[timestamp] = {
                        operations: {},
                        totalTime: 0
                    };
                }
                sessionData[timestamp].operations[record.operation_number] = record;
                sessionData[timestamp].totalTime = Math.max(sessionData[timestamp].totalTime || 0, record.total_time || 0);
            });

            // Prendre les 5 dernières sessions
            const lastFiveSessions = Object.entries(sessionData)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .slice(0, 5);

            // Mettre à jour la liste des temps totaux
            const totalTimeList = document.createElement('div');
            totalTimeList.className = 'total-time-list';
            totalTimeList.innerHTML = '<h4>Temps totaux par session:</h4>';
            lastFiveSessions.forEach(([date, session]) => {
                const totalTimeMinutes = (session.totalTime / 1000 / 60).toFixed(2);
                totalTimeList.innerHTML += `
                    <div style="margin: 10px 0; padding: 5px; border-bottom: 1px solid #eee;">
                        <strong>${new Date(date).toLocaleDateString()}</strong>: 
                        ${totalTimeMinutes} minutes
                    </div>
                `;
            });

            let existingTotalTimeList = document.querySelector('.total-time-list');
            if (existingTotalTimeList) {
                existingTotalTimeList.replaceWith(totalTimeList);
            } else {
                document.getElementById('historyPanel').appendChild(totalTimeList);
            }

            const canvas = document.getElementById('statsChart');
            
            if (currentChart) {
                currentChart.destroy();
            }

            const datasets = Array.from({ length: 8 }, (_, i) => {
                const operationNumber = i + 1;
                return {
                    label: data.find(d => d.operation_number === operationNumber)?.operation_name || `Opération ${operationNumber}`,
                    data: lastFiveSessions.map(([_, session]) => 
                        (session.operations[operationNumber]?.time_taken || 0) / 1000
                    ).reverse(),
                    backgroundColor: [
                        'rgba(0, 83, 134, 0.7)',   // Major-Color-DarkBlue
                        'rgba(29, 169, 255, 0.7)',  // Major-Color-LightBlue
                        'rgba(200, 211, 0, 0.7)',   // Biovia-Medidata-green
                        'rgba(232, 119, 34, 0.7)',  // Enovia-Netvibes-Orange
                        'rgba(218, 41, 28, 0.7)',   // SolidWorks-Red
                        'rgba(0, 150, 136, 0.7)',
                        'rgba(156, 39, 176, 0.7)',
                        'rgba(33, 150, 243, 0.7)'
                    ][i]
                };
            });

            currentChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: lastFiveSessions.map(([date]) => 
                        new Date(date).toLocaleDateString()
                    ).reverse(),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            align: 'start',
                            labels: {
                                padding: 20
                            }
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

    // Initialize step highlighting
    highlightSteps();
});