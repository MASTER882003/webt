// Vars
// -------------------------
const form = document.querySelector('form');
const canvas = document.getElementById('plot');
const result = document.getElementById('result');
const pageColorInput = document.querySelector('.page-color');
const equationLoaderDropdown = document.querySelector('select');
let primaryColor = getComputedStyle(document.body).getPropertyValue('--primary');
const axisEqual = () => document.querySelector('input[name="axis_equal"]').checked;
let plotCache = [];

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

    if (plotCache.length > 0) plot(plotCache);
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
    })

    // Init submit
    form.addEventListener('submit', onSubmit);
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