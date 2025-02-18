// Initialize Supabase client
const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';
const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);

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

    // Timer formatting function
    function formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Supabase functions for saving and loading stats
    async function saveStatsHistory() {
        const currentStats = statsHistory[statsHistory.length - 1];
        try {
            const { data, error } = await supabase
                .from('process_sessions')
                .insert([{
                    timestamp: new Date().toISOString(),
                    steps: currentStats.steps,
                    total_time: currentStats.totalTime
                }]);

            if (error) throw error;
            console.log('Stats saved successfully');
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    async function loadStatsHistory() {
        try {
            const { data, error } = await supabase
                .from('process_sessions')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(5);

            if (error) throw error;
            statsHistory = data;
            console.log('Stats loaded successfully:', statsHistory);
        } catch (error) {
            console.error('Error loading stats:', error);
            statsHistory = [];
        }
    }

    // Show history button click handler
    showHistoryButton.addEventListener('click', () => {
        statsPanel.classList.remove('visible');
        historyPanel.classList.toggle('visible');
        
        if (historyPanel.classList.contains('visible')) {
            processStepsContainer.style.display = 'none';
            window.updateChart(statsHistory);
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
    timerButton.addEventListener('click', () => {
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
            
            showStatistics();
        }
    });

    // Show statistics panel
    function showStatistics() {
        const stepStats = document.getElementById('stepStats');
        const totalTime = document.getElementById('totalTime');
        stepStats.innerHTML = '';

        let totalMs = 0;
        const currentStats = {
            timestamp: new Date().toLocaleString(),
            steps: [],
            totalTime: 0
        };

        steps.forEach((step, index) => {
            const title = step.querySelector('.process-title').textContent;
            const time = stepTimes[index];
            totalMs += time;

            currentStats.steps.push({
                title: title,
                time: time
            });

            const stepDiv = document.createElement('div');
            stepDiv.innerHTML = `<span>${title}</span><span>${formatTime(time)}</span>`;
            stepStats.appendChild(stepDiv);
        });

        currentStats.totalTime = totalMs;
        statsHistory.push(currentStats);
        saveStatsHistory();
        
        totalTime.textContent = `Total Time: ${formatTime(totalMs)}`;
        statsPanel.classList.add('visible');
    }

    // Next operation handler
    window.nextOp = function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);

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
        }
    };

    // Reset operation handler
    window.resetOp = function(element) {
        const processStep = element.closest('.process-step');
        const stepIndex = Array.from(steps).indexOf(processStep);

        // Reset timing for this step and all subsequent steps
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

        // Reset subsequent steps in the process
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

    // Window message event listener
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

                // Update highlighted steps
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

    // Initialize
    highlightSteps();
    loadStatsHistory();
});