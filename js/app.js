// Vars
// -------------------------
const form = document.querySelector('form');
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const result = document.getElementById('result');
const pageColorInput = document.querySelector('.page-color');
const equationLoaderDropdown = document.querySelector('select');
const getPrimaryColor = () => getComputedStyle(document.body).getPropertyValue('--primary');

// Initial plotConfig
let plotConfig = {
    dataPoints: [],
    minLinesX: 10,
    offsetX: 0,
    offsetY: 0,
    zoom: 10
}

// Util
// -------------------------

function setPrimaryColor(color) {
    document.querySelector('body').style.setProperty('--primary', color);
    pageColorInput.value = color;

    if (plotConfig.dataPoints.length > 0) plot(plotConfig.dataPoints);
}

function reloadStoredEquations() {
    fetch('server.php?action=get_equations').then(response => response.json()).then(response => {
        if (response.data.equations.length == 0) return;

        equationLoaderDropdown.innerHTML = '';
        equationLoaderDropdown.append(new Option('Select equation', null));

        response.data.equations.map(equation => new Option(equation.name, equation.name))
            .forEach(option => equationLoaderDropdown.append(option));
    });
}

function drawLine(from, to) {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.closePath();
    ctx.stroke();
}

// Validation
// -------------------------
const validationRules = {
    required: {
        validator: (value) => value != null && value != '',
        message: 'The field {label} is required!'
    },
    hex_code: {
        validator: (value) => new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/).test(value),
        message: '{label} is not a valid hexcode'
    },
    deg_or_rad: {
        validator: (value) => ['rad', 'deg'].includes(value),
        message: '{label} can only be deg or rad.'
    },
    equation: {
        validator: (value) => new RegExp(/^(?:[x \(\)\*+-\/0-9]|sin|cos|tan|sqrt|%pi|%e)*$/).test(value ?? ''),
        message: '{label} is not a valid equation'
    }
}

function validate(data, fields) {

    let errors = {};

    for (const [name, options] of Object.entries(fields)) {

        const value = data[name] ?? null;

        options.rules.forEach(rule => {
            const validationRule = validationRules[rule];

            if (!validationRule.validator(value)) {
                if (!Object.hasOwn(errors, name)) {
                    errors[name] = [validationRule.message.replace('{label}', options.label)];
                } else {
                    errors[name].push(validationRule.message.replace('{label}', options.label))
                }
            }
        });
    }

    return Object.entries(errors).length == 0 ? true : errors;
}
 

function showErrors(errors) {
    for (const [name, error] of Object.entries(errors)) {
        document.querySelector(`[data-related-field="${name}"]`).innerHTML = error.join(', ');
    }
}

// Logic
// -------------------------
function init() {

    // Init page color
    // ----------
    fetch('server.php?action=get_color').then(response => response.json())
        .then((response) => setPrimaryColor(response.data.color))

    // Page color change
    pageColorInput.addEventListener('change', function () {
        const data = new FormData();
        data.append('color', this.value);
        data.append('action', 'save_color');
        fetch('server.php', {
            method: 'POST',
            body: data
        }).then(() => {
            setPrimaryColor(this.value);
        });
    });

    // Load stored equations
    reloadStoredEquations();

    equationLoaderDropdown.addEventListener('change', function () {
        fetch('server.php?action=get_equation&name=' + this.value).then(response => response.json()).then(response => {
            document.querySelector(`#angle_unit_${response.data.equation.angle_unit}`).checked = true;
            document.querySelector(`input[name="persist"]`).checked = true;
            document.querySelector(`input[name="name"]`).value = response.data.equation.name;
            document.querySelector(`input[name="equation"]`).value = response.data.equation.equation;

            plot(response.data.plot);
        })
    });

    // Init submit
    form.addEventListener('submit', onSubmit);

    // User action
    // ------------------------------
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        plotConfig.zoom *= (e.deltaY > 0 ? 0.9 : 1.1);
        plot(plotConfig.dataPoints);
    });

    // Dragging
    let isDragging = false;
    let startDragX, startDragY;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startDragX = e.clientX;
        startDragY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {

            plotConfig.offsetX += e.clientX - startDragX;
            plotConfig.offsetY += e.clientY - startDragY;

            plot(plotConfig.dataPoints);

            startDragX = e.clientX;
            startDragY = e.clientY;
        }
    });

    // Create default plot
    plot([]);
}


function onSubmit(event) {
    event.preventDefault();

    // Reset errors
    document.querySelectorAll('.error').forEach(element => element.innerHTML = '');

    const data = new FormData(form);
    data.append('action', 'execute_equation');

    let rules = {
        angle_unit: { rules: ['required', 'deg_or_rad'], label: 'Angle unit' },
        equation: { rules: ['required', 'equation'], label: 'Equation'},
    };

    if (data.get('persist')) {
        rules.name = { rules: ['required'], label: 'Name'};
    }

    // Validate data
    const errors = validate(Object.fromEntries(data.entries()), rules);

    if (typeof errors == 'object') return showErrors(errors);
    
    fetch('server.php', {
        method: 'POST',
        body: data
    }).then(response => response.json())
        .then(response => {

            if (response.errors) return showErrors(response.errors);

            plot(response.data.plot);

            if (document.querySelector('input[name="persist"]').checked) {
                reloadStoredEquations();
            }
        })
        .catch(error => {
            console.log(error);
        })

    return false;
}

function plot(dataPoints) {

    // Stored if color of website changes and other changes
    plotConfig.dataPoints = dataPoints;
    // Calculate width and height
    const width = canvas.width = result.clientWidth;
    const height = canvas.height = 9 / 16 * width;

    // Draw background / Clear
    ctx.font = '10px Arial';
    ctx.fillStyle = "#616161";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Calculate stuff
    const canvasScale = width / (2 * plotConfig.zoom);
    const centerPosition = {
        x: width / 2 + plotConfig.offsetX,
        y: height / 2 + plotConfig.offsetY
    };
    const visibleXValues = [
        -plotConfig.zoom - plotConfig.offsetX / canvasScale,
        plotConfig.zoom - plotConfig.offsetX / canvasScale
    ];

    const dimension = parseInt((visibleXValues[1] - visibleXValues[0]).toExponential().split('e').pop()) - 1;

    let stepSize = 1 * 10 ** dimension;
    if ((visibleXValues[1] - visibleXValues[0]) / ((2 * 10 ** dimension)) >= plotConfig.minLinesX) {
        stepSize = 2 * 10 ** dimension;
    }
    if ((visibleXValues[1] - visibleXValues[0]) / ((5 * 10 ** dimension)) >= plotConfig.minLinesX) {
        stepSize = 5 * 10 ** dimension;
    }

    const spaceBetweenLines = stepSize * canvasScale;
    // Draw coordinate system
    // ---------------------------------
    // Lines across
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 2;

    // X-Lines to right
    for (let i = 1; centerPosition.x + i * spaceBetweenLines < width; i++) {
        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;

        drawLine([centerPosition.x + i * spaceBetweenLines, 0], [centerPosition.x + i * spaceBetweenLines, height]);
        ctx.fillText(axisLabel, centerPosition.x + i * spaceBetweenLines, centerPosition.y + 15);
    }

    // X-Lines to left
    for (let i = 1; centerPosition.x - i * spaceBetweenLines > 0; i++) {
        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;
        
        drawLine([centerPosition.x - i * spaceBetweenLines, 0], [centerPosition.x - i * spaceBetweenLines, height]);
        ctx.fillText(-axisLabel, centerPosition.x - i * spaceBetweenLines, centerPosition.y + 15);
    }


    // Y-Lines to top
    for (let i = 0; centerPosition.y - i * spaceBetweenLines > 0; i++) {
        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;

        drawLine([0, centerPosition.y - i * spaceBetweenLines], [width, centerPosition.y - i * spaceBetweenLines]);
        ctx.fillText(axisLabel, centerPosition.x + 5, centerPosition.y - i * spaceBetweenLines - 5);

    }

    // Y-Lines to bottom
    for (let i = 0; centerPosition.y + i * spaceBetweenLines < height; i++) {
        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;
        
        drawLine([0, centerPosition.y + i * spaceBetweenLines], [width, centerPosition.y + i * spaceBetweenLines]);
        ctx.fillText(-axisLabel, centerPosition.x + 5, centerPosition.y + i * spaceBetweenLines - 5);
    }

    
    // X and Y Axis
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    // X
    drawLine([centerPosition.x, 0], [centerPosition.x, height]);
    // Y
    drawLine([0, centerPosition.y], [width, centerPosition.y]);
    // Zero (Center)
    ctx.fillText('0', centerPosition.x + 5, centerPosition.y + 15);
    ctx.stroke();


    // Plotting
    // -----------------------
    // No data
    if (dataPoints.length == 0) return;

    // Plot the graph
    ctx.strokeStyle = getPrimaryColor();
    ctx.beginPath();

    // Go to starting point
    ctx.moveTo(centerPosition.x + dataPoints[0].x * canvasScale, centerPosition.y - dataPoints[0].y * canvasScale);

    for (let i = 1; i < dataPoints.length; i++) {
        ctx.lineTo(centerPosition.x + dataPoints[i].x * canvasScale, centerPosition.y - dataPoints[i].y * canvasScale);
    }
    ctx.stroke();
}


window.onload = init;