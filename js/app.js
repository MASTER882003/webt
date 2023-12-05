// Vars
// -------------------------
const form = document.querySelector('form');
const canvas = document.getElementById('plot');
const result = document.getElementById('result');
const pageColorInput = document.querySelector('.page-color');
const equationLoaderDropdown = document.querySelector('select');
let primaryColor = getComputedStyle(document.body).getPropertyValue('--primary');
const axisEqual = () => document.querySelector('input[name="axis_equal"]').checked;

// Initial plotConfig
let plotConfig = {
    dataPoints: [],
    edgeValues: [-5, 5, -5, 5],
    minLinesX: 10,
    zoom: 5
}

// Util
// -------------------------
function createNode(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
}

function getCookie(name) {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setPrimaryColor(color) {
    primaryColor = color;
    document.querySelector('body').style.setProperty('--primary', primaryColor);
    pageColorInput.value = primaryColor;

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

// Logic
// -------------------------

function init() {

    // Init page color
    // ----------
    const storedColor = getCookie('color') ?? primaryColor;
    if (storedColor != primaryColor) {
        setPrimaryColor(decodeURIComponent(storedColor));
    }

    pageColorInput.value = primaryColor;

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

    fetch('server.php?action=get_equation&name=Cubic').then(response => response.json()).then(response => {
        document.querySelector(`#angle_unit_${response.data.equation.angle_unit}`).checked = true;
        document.querySelector(`input[name="persist"]`).checked = true;
        document.querySelector(`input[name="name"]`).value = response.data.equation.name;
        document.querySelector(`input[name="equation"]`).value = response.data.equation.equation;

        plot(response.data.plot);
    });

    // User action
    // ------------------------------
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        plotConfig.zoom *= (e.deltaY > 0 ? 0.9 : 1.1);
        plot(plotConfig.dataPoints);
    });

}


function onSubmit(event) {
    event.preventDefault();

    const data = new FormData(form);
    data.append('action', 'execute_equation');
    
    fetch('server.php', {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(response => {
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

    // Zoom$

    // Stored if color of website changes and other changes
    plotConfig.dataPoints = dataPoints;

    // Recalculate the edge values
    const edgeValues = plotConfig.edgeValues.map(v => v * plotConfig.zoom);

    // Calculate width and height
    const width = result.clientWidth;
    const height = 9 / 16 * width;
    canvas.height = height;
    canvas.width = width;

    // Draw background / Clear
    const ctx = canvas.getContext('2d');
    ctx.font = '10px Arial';
    ctx.fillStyle = "#616161";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Calculate stuff
    const scale = width / ((edgeValues[1] - edgeValues[0]) / 2);
    const center = {
        x: width / 2 + scale * (edgeValues[1] + edgeValues[0]) / 2,
        y: height / 2 + scale * (edgeValues[3] + edgeValues[2]) / 2
    };

    const dimension = parseInt((edgeValues[1] - edgeValues[0]).toExponential().split('e').pop()) - 1;

    let stepSize = 1 * 10 ** dimension;
    if ((edgeValues[1] - edgeValues[0]) / ((2 * 10 ** dimension) / plotConfig.zoom) >= plotConfig.minLinesX) {
        stepSize = 2 * 10 ** dimension;
    }
    else if ((edgeValues[1] - edgeValues[0]) / ((5 * 10 ** dimension) /plotConfig.zoom) >= plotConfig.minLinesX) {
        stepSize = 5 * 10 ** dimension;
    }

    let spaceBetweenLines = stepSize * scale;
    let steps = (edgeValues[1] - edgeValues[0]) / (stepSize / plotConfig.zoom);

    // Draw coordinate system
    // ---------------------------------
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 2;
    // X-Axis lines
    for (let i = 0; i <= steps; i++) {

        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;

        // Right
        ctx.beginPath();
        ctx.moveTo(center.x + i * spaceBetweenLines, 0);
        ctx.lineTo(center.x + i * spaceBetweenLines, height);
        ctx.fillText(axisLabel, center.x + i * spaceBetweenLines, center.y + 15);

        // Left
        ctx.moveTo(center.x - i * spaceBetweenLines, 0);
        ctx.lineTo(center.x - i * spaceBetweenLines, height);
        ctx.stroke();
        ctx.fillText(-axisLabel, center.x - i * spaceBetweenLines, center.y + 15);
        ctx.closePath();
        ctx.stroke();

    }
    // Y-Axis Lines
    for (let i = 0; i <= steps; i++) {

        const axisLabel = dimension < 0 ? (i * stepSize).toFixed(Math.min(20, -dimension)) : i * stepSize;

        // Top
        ctx.beginPath();
        ctx.moveTo(0, center.y - i * spaceBetweenLines);
        ctx.lineTo(width, center.y - i * spaceBetweenLines);
        ctx.fillText(axisLabel, center.x + 5, center.y - i * spaceBetweenLines - 5);
        
        // Bottom
        ctx.moveTo(0, center.y + i * spaceBetweenLines);
        ctx.lineTo(width, center.y + i * spaceBetweenLines);
        ctx.fillText(-axisLabel, center.x + 5, center.y + i * spaceBetweenLines - 5);
        ctx.closePath();
        ctx.stroke();
    }

    // X and Y Axis
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    // X
    ctx.beginPath();
    ctx.moveTo(center.x, 0);
    ctx.lineTo(center.x, height);
    // Y
    ctx.moveTo(0, center.y);
    ctx.lineTo(width, center.y);
    ctx.closePath();
    ctx.stroke();
    
    // Zero (Center)
    ctx.fillText('0', center.x + 5, center.y + 15);
    ctx.stroke();

    // Plotting
    // -----------------------
    // No data
    if (dataPoints.length == 0) return;

    // Plot the graph
    ctx.beginPath();

    // Go to starting point
    ctx.moveTo(center.x + dataPoints[0].x * scale, center.y - dataPoints[0].y * scale);

    for (let i = 1; i < dataPoints.length; i++) {
        if (dataPoints[i].y == null) {

            // Go to next point if possible
            if (i + 1 < dataPoints.length) {
                ctx.moveTo(center.x + dataPoints[i + 1].x * scale, center.y - dataPoints[i + 1].y * scale);
            }
            continue;
        }
        ctx.lineTo(center.x + dataPoints[i].x * scale, center.y - dataPoints[i].y * scale);
    }

    ctx.strokeStyle = primaryColor;
    ctx.stroke();
}

function plot_old(dataPoints) {
    plotCache = dataPoints;

    // Calculate width and height
    const width = result.clientWidth / 4 * 3;
    const height = 9 / 16 * width;
    canvas.height = height;
    canvas.width = width;

    // Draw background
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.fillStyle = "#616161";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    
    // Find the minimum and maximum values for x and y
    const minX = Math.min(...dataPoints.map(point => point.x));
    const maxX = Math.max(...dataPoints.map(point => point.x));
    const minY = Math.min(...dataPoints.map(point => point.y));
    const maxY = Math.max(...dataPoints.map(point => point.y));

    // Make sure we have some space between the plot and the edge of the canvas
    const padding = Math.max(height, width) * 0.08;

    // Calculate the scaling
    let xScale = (width - 2 * padding) / (maxX - minX);
    let yScale = (height - 2 * padding) / (maxY - minY);

    if (axisEqual()) {
        xScale = yScale = Math.min(xScale, yScale);
    }

    const positionXAxis = height - padding - Math.abs(Math.min(0, minY)) * yScale;
    const positionYAxis = width - padding - Math.abs(Math.min(0, minX)) * xScale;

    // Set up axis
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    // X-Axis
    ctx.moveTo(padding, positionXAxis);
    ctx.lineTo(width - padding, positionXAxis);
    // Y-Axis
    ctx.moveTo(positionYAxis, padding);
    ctx.lineTo(positionYAxis, height - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'white';
    if (maxX != 0) {
        ctx.fillText(maxX, width - padding - toString(maxX).length, positionXAxis + 15);
    }
    if (minX != 0 && minX < 0) {
        ctx.fillText(minX, padding, positionXAxis + 15);
    }
    if (maxY != 0) {
        ctx.fillText(maxY, positionYAxis + 5, padding);
    }
    if (minY != 0 && minY < 0) {
        ctx.fillText(minY, positionYAxis + 5, height - padding);
    }
    // Zero (Center)
    ctx.fillText('0', positionYAxis + 5, positionXAxis + 10);

    // No data
    if (dataPoints.length == 0) return;

    // Plot the graph
    ctx.beginPath();

    // Go to starting point
    ctx.moveTo(positionYAxis + dataPoints[0].x * xScale, positionXAxis - dataPoints[0].y * yScale);

    for (let i = 1; i < dataPoints.length; i++) {
        if (dataPoints[i].y == null) {

            // Go to next point if possible
            if (i + 1 < dataPoints.length) {
                ctx.moveTo(positionYAxis + dataPoints[i + 1].x * xScale, positionXAxis - dataPoints[i + 1].y * yScale);
            }

            continue;
        }
        const x = positionYAxis + dataPoints[i].x * xScale;
        const y = positionXAxis - dataPoints[i].y * yScale;
        ctx.lineTo(x, y);
    }

    ctx.strokeStyle = primaryColor;
    ctx.stroke();
}

window.onload = init();