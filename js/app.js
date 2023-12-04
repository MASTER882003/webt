// Vars
// -------------------------

// Template for the equation lines
const calculatorLineTemplate = `
<div class="w3-card w3-padding w3-margin-bottom w3-dark-gray w3-round">
    <input type="text" class="w3-input w3-round w3-light-gray" name="equation" />
</div>
`;

const equationContainer = document.getElementById('equations');
const form = document.querySelector('form');
const result = document.getElementById('result');
const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary');
const axisEqual = () => document.querySelector('input[name="axis_equal"]').checked;

// Util
// -------------------------
function createNode(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
}

// Logic
// -------------------------

function init() {

    // Add an initial equation line
    appendEquationLine();

    // Init submit
    form.addEventListener('submit', onSubmit);

    const graph = {
        min: -3,
        max: 3,
        stepLength: .05,
        equation: (x) => x ** 3 - 3 * x + 2
    }

    const data = [];
    for (let x = graph.min; x <= graph.max; x += graph.stepLength) {
        data.push({
            x,
            y: graph.equation(x)
        })
    }
    plot(data);
}

// Append a new equation line
function appendEquationLine(afterElement = null) {
    const line = createNode(calculatorLineTemplate);
    const input = line.querySelector('input');
    
    if (!afterElement) {
        equationContainer.appendChild(line);
    } else {
        afterElement.after(line);
    }

    line.addEventListener('keydown', (e) => {

        // Append newline
        if (e.shiftKey && e.key == 'Enter') {
            e.preventDefault();
            const newLine = appendEquationLine(line);
            return newLine.querySelector('input').focus();
        }

        // Remove line
        if (e.key == 'Backspace' && input.value.length == 0 && equationContainer.querySelectorAll('input').length > 1) {
            return line.remove();
        }
    });

    return line;
}


function onSubmit(e) {
    e.preventDefault();

    const data = new FormData(form);
    data.append('action', 'execute_equation');
    
    fetch('server.php', {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(response => {
            clearResult();
            plot(response.plot);
    })
    .catch(error => {
        console.log(error);
    })

    return false;
}

function clearResult() {
    result.innerHTML = '';
}

function plot(dataPoints) {
    const canvas = document.createElement('canvas');
    result.appendChild(canvas);

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
        const x = positionYAxis + dataPoints[i].x * xScale;
        const y = positionXAxis - dataPoints[i].y * yScale;
        ctx.lineTo(x, y);
    }

    ctx.strokeStyle = primaryColor;
    ctx.stroke();
}

window.onload = init();