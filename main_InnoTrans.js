<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Process Steps</title>
    <style>
        :root {
            --Major-Color-DarkBlue: #005386;
            --Major-Color-LightBlue: #1DA9FF;
            --Delmia-Yellow: #FFD100;
            --Biovia-Medidata-green: #C8D300;
            --Enovia-Netvibes-Orange: #E87722;
            --SolidWorks-Red: #DA291C;
        }

        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }

        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            background-color: var(--Major-Color-DarkBlue);
            padding: 10px 20px;
            border-radius: 8px;
            color: white;
        }

        #compass {
            width: 30px;
            height: 30px;
            margin-right: 15px;
            cursor: pointer;
        }

        #title {
            font-size: 1.5em;
            margin-right: auto;
        }

        .timer-button {
            padding: 8px 16px;
            margin: 0 10px;
            border: none;
            border-radius: 4px;
            background-color: var(--Major-Color-DarkBlue);
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .timer-button:hover {
            background-color: var(--Major-Color-LightBlue);
        }

        .timer-button.running {
            background-color: #dc3545;
        }

        .timer-display {
            font-family: monospace;
            font-size: 1.2em;
            padding: 8px;
            margin: 0 10px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        .process-steps {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .process-step {
            display: flex;
            align-items: center;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s;
        }

        .process-step.highlighted {
            background-color: #e8f4ff;
        }

        .process-number {
            width: 30px;
            height: 30px;
            background-color: var(--Major-Color-DarkBlue);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
        }

        .process-info {
            flex-grow: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-right: 15px;
        }

        .process-title {
            font-weight: bold;
        }

        .process-image {
            width: 24px;
            height: 24px;
            margin-left: 10px;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .process-image:hover {
            transform: scale(1.1);
        }

        .chart-container {
            padding: 20px;
            background: white;
            border-radius: 8px;
            margin: 20px 0;
            height: 400px;
        }

        .current-step-indicator {
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: var(--Major-Color-DarkBlue);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 18px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .current-step-indicator .step-number {
            font-weight: bold;
            color: var(--Delmia-Yellow);
            margin-right: 10px;
        }

        .stats-panel {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            min-width: 300px;
            max-width: 80%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .stats-panel.visible {
            display: block;
        }

        #stepStats div {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }

        #totalTime {
            margin-top: 20px;
            font-weight: bold;
            text-align: right;
        }
    </style>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Supabase -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="header">
        <img id="compass" type="button" src="Ressources/compass.png" onclick="openMain()">
        <span id="title">Process Steps</span>
        <button id="timerButton" class="timer-button">Start Timer</button>
        <span id="globalTimer" class="timer-display">00:00:00</span>
        <button id="showHistoryButton" class="timer-button">Show History</button>
    </div>

    <div class="current-step-indicator">
        <span class="step-number">Step 1</span>
        <span class="step-title">Remove Top Cover 1</span>
    </div>

    <div class="process-steps">
        <div class="process-step">
            <span class="process-number">1</span>
            <div class="process-info">
                <span class="process-title">Remove Top Cover 1</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>
    
        <div class="process-step">
            <span class="process-number">2</span>
            <div class="process-info">
                <span class="process-title">Remove Top Cover 2</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">3</span>
            <div class="process-info">
                <span class="process-title">Place Removing Tool</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">4</span>
            <div class="process-info">
                <span class="process-title">Remove Left Door</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image validate-button" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image reset-button" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">5</span>
            <div class="process-info">
                <span class="process-title">Remove Bolts</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">6</span>
            <div class="process-info">
                <span class="process-title">Remove Plate</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">7</span>
            <div class="process-info">
                <span class="process-title">Remove Internal Stopper</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>

        <div class="process-step">
            <span class="process-number">8</span>
            <div class="process-info">
                <span class="process-title">Remove Four Rollers</span>
                <span class="timer-display">00:00:00</span>
            </div>
            <a href="javascript:void(0)" onclick="nextOp(this)">
                <img class="process-image" src="Ressources/validate.png" alt="Validate">
            </a>
            <a href="javascript:void(0)" onclick="resetOp(this)">
                <img class="process-image" src="Ressources/cancel.png" alt="Restart">
            </a>
        </div>
    </div>

    <div id="statsPanel" class="stats-panel">
        <h3>Process Statistics</h3>
        <div id="stepStats"></div>
        <div id="totalTime"></div>
    </div>

    <div id="historyPanel" class="stats-panel">
        <h3>Comparaison des 5 dernières sessions</h3>
        <div class="chart-container">
            <canvas id="statsChart"></canvas>
        </div>
    </div>

    <script>
        // Configuration Supabase
        const supabaseUrl = 'https://kikivfglslrobwttvlvn.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpa2l2Zmdsc2xyb2J3dHR2bHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTIwNDQsImV4cCI6MjA1MDA4ODA0NH0.Njo06GXSyZHjpjRwPJ2zpElJ88VYgqN2YYDfTJnBQ6k';
        const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

        let currentChart = null;

        // Fonction pour afficher le graphique
        window.updateChart = function(data) {
            const lastFiveSessions = data.slice(-5).reverse();
            const canvas = document.getElementById('statsChart');
            
            // Détruire le graphique existant s'il y en a un
            if (currentChart) {
                currentChart.destroy();
            }

            if (lastFiveSessions.length === 0) {
                return;
            }

            // Préparer les données pour le graphique
            const labels = lastFiveSessions[0].steps.map(step => step.title);
            const datasets = lastFiveSessions.map((session, index) => ({
                label: `Session ${lastFiveSessions.length - index} (${new Date(session.timestamp).toLocaleDateString()})`,
                data: session.steps.map(step => step.time / 1000), // Convertir en secondes
                backgroundColor: [
                    'rgba(0, 83, 134, 0.7)',   // Major-Color-DarkBlue
                    'rgba(29, 169, 255, 0.7)', // Major-Color-LightBlue
                    'rgba(200, 211, 0, 0.7)',  // Biovia-Medidata-green
                    'rgba(232, 119, 34, 0.7)', // Enovia-Netvibes-Orange
                    'rgba(218, 41, 28, 0.7)'   // SolidWorks-Red
                ][index],
                borderColor: [
                    'rgb(0, 83, 134)',   // Major-Color-DarkBlue
                    'rgb(29, 169, 255)', // Major-Color-LightBlue
                    'rgb(200, 211, 0)',  // Biovia-Medidata-green
                    'rgb(232, 119, 34)', // Enovia-Netvibes-Orange
                    'rgb(218, 41, 28)'   // SolidWorks-Red
                ][index],
                borderWidth: 1
            }));

            // Créer le graphique
            currentChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: false
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
        };
    </script>

    <!-- Le fichier JavaScript principal -->
    <script src="main_InnoTrans.js"></script>
</body>
</html>