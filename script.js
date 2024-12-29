const NODE_RADIUS = 18;

const alphabet = ['0', '1'];

let selectedStates = [];
let selectedEdges = [];

function clearSelection() {
    selectedStates.forEach(n => n.removeClass('node-selected'));
    selectedEdges.forEach(n => n.removeClass('edge-selected'));
    selectedStates = [];
    selectedEdges = [];
}

let isCreatingTransition = false;

const cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [
        { data: { id: 'q0', label: 'q0' }, classes: 'start' },
        { data: { id: 'q1', label: 'q1' } },
        { data: { id: 'q2', label: 'q2' }, classes: 'accept' },
        // TODO: better loop transitions
        // TODO: multiple symbols per edge
    ],
    style: [
        {
            selector: 'node',
            style: {
                'background-color': 'white',
                'border-width': 1.5,
                'border-color': 'black',
                'label': 'data(label)',
                'text-valign': 'center',
                'color': 'black',
                'width': 2 * NODE_RADIUS,
                'height': 2 * NODE_RADIUS,
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 1.5,
                'line-color': 'black',
                'target-arrow-color': 'black',
                'target-arrow-shape': 'triangle-backcurve',
                'curve-style': 'bezier',
                'control-point-step-size': 60,
                'label': 'data(label)',
                'color': '#000',
                'font-size': 10,
                'text-background-padding': '3px',
                'text-background-color': 'white',
                'text-background-opacity': 1,
                'text-background-shape': 'round-rectangle'
            }
        },
        {
            selector: '.start',
            style: {
                // TODO: start state style?
            }
        },
        {
            selector: '.accept',
            style: {
                'shape': 'ellipse',
                'border-width': 5,
                'border-style': 'double',
                'border-color': 'black'
            }
        },
        {
            selector: '.phantom',
            style: {
                'display': 'none'
            }
        },
        {
            selector: '.node-selected',
            style: {
                'border-color': 'dodgerblue',
                'color': 'dodgerblue'
            }
        },
        {
            selector: '.current-simulation-state',
            style: {
                'background-color': 'lightgreen'
            }
        },
        {
            selector: '.edge-selected',
            style: {
                'color': 'dodgerblue',
                'line-color': 'dodgerblue',
                'target-arrow-color': 'dodgerblue'
            }
        },
        {
            selector: '.phantom-edge',
            style: {
                'line-color': 'lightgrey',
                'target-arrow-color': 'lightgrey',
                'color': 'lightgrey'
            }
        },
        {
            selector: '.phantom-node',
            style: {
                'border-color': 'lightgrey',
                'color': 'lightgrey'
            }
        },
        {
            selector: '.invisible',
            style: {
                'display': 'none'
            }
        }
    ],
    layout: {
        name: 'grid',
        rows: 1
    }
});

function uniqueNodeName() {
    const nodeNames = cy.nodes().map(node => node.data().label);
    let i = 0;
    while (nodeNames.includes(`q${i}`)) {
        i += 1;
    }
    return `q${i}`;
}

function phantomEdges() {
    return cy.edges().filter(edge => edge.classes().includes('phantom-edge'));
}

function phantomNodes() {
    return cy.nodes().filter(node => node.classes().includes('phantom-node'));
}

cy.on('tap', 'node', function (event) {
    if (isCreatingTransition) {
        if (phantomNodes().includes(event.target)) {
            // clicked on phantom node
            event.target.removeClass('phantom-node');
            event.target.data('label', event.target.id());
            phantomEdges().forEach(edge => edge.removeClass('phantom-edge'));
        } else {
            // clicked on existing node
            phantomNodes().forEach(node => node.remove());
            phantomEdges().forEach(edge => edge.removeClass('phantom-edge'));
        }
        isCreatingTransition = false;
        clearSelection();
    } else {
        const node = event.target;
        if (event.originalEvent.shiftKey) {
            if (selectedStates.includes(node)) {
                selectedStates.splice(selectedStates.indexOf(node), 1);
                node.removeClass('node-selected');
            } else {
                selectedStates.push(node);
                node.addClass('node-selected');
            }
        } else {
            selectedStates.forEach(n => n.removeClass('node-selected'));
            selectedEdges.forEach(n => n.removeClass('edge-selected'));
            selectedStates = [node];
            selectedEdges = [];
            node.addClass('node-selected');
        }
    }
});

cy.on('tap', 'edge', function (event) {
    if (isCreatingTransition) {
        return;
    }
    const edge = event.target;
    if (event.originalEvent.shiftKey) {
        if (selectedEdges.includes(edge)) {
            selectedEdges.splice(selectedEdges.indexOf(edge), 1);
            edge.removeClass('edge-selected');
        } else {
            selectedEdges.push(edge);
            edge.addClass('edge-selected');
        }
    } else {
        selectedStates.forEach(n => n.removeClass('node-selected'));
        selectedEdges.forEach(n => n.removeClass('edge-selected'));
        selectedStates = [];
        selectedEdges = [edge];
        edge.addClass('edge-selected');
    }
});

cy.on('tap', (event) => {
    if (isCreatingTransition) {
        return;
    }
    if (event.target === cy) {
        clearSelection();
        clearContextMenus();
    }
});

window.addEventListener('keydown', function (event) {
    if (isCreatingTransition) {
        if (event.key === 'Escape') {
            cy.nodes().filter(node => node.data().label === '').forEach(node => node.remove());
            cy.edges().filter(edge => edge.classes().includes('phantom-edge')).forEach(edge => edge.remove());
            isCreatingTransition = false;
        }
    }
    if (selectedStates.length > 0) {
        if (alphabet.includes(event.key)) {
            isCreatingTransition = true;
            const pos = selectedStates[0].position();
            const newName = uniqueNodeName();
            cy.add([
                { group: 'nodes', data: { id: newName, label: '' }, classes: 'phantom-node' },
            ]);
            const phantomState = cy.getElementById(newName);
            phantomState.position({ x: pos.x + 5, y: pos.y + 5 });
            selectedStates.forEach(node => {
                cy.add([
                    { group: 'edges', data: { source: node.id(), target: newName, label: event.key }, classes: 'phantom-edge' }
                ]);
            });
        } else {
            // TODO: suggest adding symbol to alphabet
        }
    }
    if (event.key === 'n') {
        const newNodeId = 'q' + (cy.nodes().length);
        cy.add({
            group: 'nodes',
            data: { id: newNodeId, label: newNodeId },
            position: { x: 500, y: 400 },
        });
    }
});

function canvasPosition(x, y) {
    const pan = cy.pan();
    const zoom = cy.zoom();
    const canvasX = (x - pan.x) / zoom;
    const canvasY = (y - pan.y) / zoom;
    return { x: canvasX, y: canvasY };
}

document.addEventListener('mousemove', function (event) {
    if (!isCreatingTransition) {
        return;
    }
    const phantomState = phantomNodes()[0];
    phantomState.position(canvasPosition(event.clientX, event.clientY));
    const regularStates = cy.nodes().filter(node => node !== phantomState);
    for (const node of regularStates) {
        const bbox = node.renderedBoundingBox();
        if (event.clientX >= bbox.x1 && event.clientX <= bbox.x2 && event.clientY >= bbox.y1 && event.clientY <= bbox.y2) {
            phantomEdges().forEach(edge => {
                const data = edge.data();
                edge.remove();
                cy.add({ group: 'edges', data: { id: data.id, source: data.source, target: node.id(), label: data.label }, classes: 'phantom-edge' });
            })
            phantomState.addClass('invisible');
            return;
        }
    }
    phantomEdges().forEach(edge => {
        const data = edge.data();
        edge.remove();
        cy.add({ group: 'edges', data: { id: data.id, source: data.source, target: phantomState.id(), label: data.label }, classes: 'phantom-edge' });
    });
    phantomState.removeClass('invisible');
});

let addAlphabetItemInputVisible = false;

document.querySelector('#add-alphabet-item-button').addEventListener('click', function (_) {
    const inputContainer = document.querySelector('#add-alphabet-item-input-container');
    const addAlphabetItemButton = document.querySelector('#add-alphabet-item-button');
    if (addAlphabetItemInputVisible) {
        inputContainer.classList.add('d-none');
        addAlphabetItemInputVisible = false;
    } else {
        const btnRect = addAlphabetItemButton.getBoundingClientRect();
        inputContainer.style.top = `${btnRect.bottom + window.scrollY}px`;
        inputContainer.style.left = `${btnRect.left + window.scrollX - 20}px`;
        inputContainer.classList.remove('d-none');
        const itemInput = document.querySelector('#add-alphabet-item-input');
        itemInput.focus();
        itemInput.value = "";
        addAlphabetItemInputVisible = true;
    }
});

function renderAlphabet() {
    const alphabetContainer = document.querySelector('#alphabet-container');
    alphabetContainer.innerHTML = '';

    alphabet.forEach(symbol => {
        const listItem = document.createElement('button');
        listItem.classList.add('btn', 'btn-light', 'alphabet-item', 'me-2');
        listItem.style.width = '36px';
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'center';
        listItem.style.alignItems = 'center';
        listItem.textContent = symbol;
        listItem.addEventListener('mouseenter', () => {
            listItem.classList.remove('btn-light');
            listItem.classList.add('btn-danger');
            listItem.innerHTML = '<span class="fas fa-trash ps-0 ms-0"></span>';
        });
        listItem.addEventListener('mouseleave', () => {
            listItem.innerHTML = symbol;
            listItem.classList.remove('btn-danger');
            listItem.classList.add('btn-light');
        });
        listItem.addEventListener('click', () => {
            alphabet.splice(alphabet.indexOf(symbol), 1);
            listItem.remove();
            // TODO: adjust this for transitions with multiple symbols
            cy.edges().filter(edge => edge.data().label === symbol).forEach(edge => edge.remove());
        })
        alphabetContainer.appendChild(listItem);
    });
}

function addAlphabetItem(symbol) {
    alphabet.push(symbol);
    alphabet.sort();
    renderAlphabet();
}

document.querySelector('#add-alphabet-item-input').addEventListener('input', function (event) {
    const symbol = event.target.value;
    if (symbol.length === 1) {
        if (symbol.trim() === '') {
            // TODO: error, symbol must not be whitespace
        }
        if (alphabet.includes(symbol)) {
            // TODO: error, no duplicates allowed
        }
        document.querySelector('#add-alphabet-item-input-container').classList.add('d-none');
        addAlphabetItemInputVisible = false;
        addAlphabetItem(symbol);
    } else if (symbol.length > 1) {
        // TODO: error, alphabet items must be single characters
    }
});

document.addEventListener('click', function (event) {
    const inputContainer = document.querySelector('#add-alphabet-item-input-container');
    const button = document.querySelector('#add-alphabet-item-button');
    if (!(inputContainer.contains(event.target) || button.contains(event.target))) {
        inputContainer.classList.add('d-none');
        addAlphabetItemInputVisible = false;
    }
});

document.querySelector('#sidebar').addEventListener('click', function (_) {
    clearSelection();
});

function clearContextMenus() {
    document.getElementById('edge-context-menu').style.display = 'none';
    document.getElementById('node-context-menu').style.display = 'none';
    document.getElementById('common-context-menu').style.display = 'none';
}

function showNodeContextMenu(event) {
    const ctxMenu = document.getElementById('node-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';

    const startCheckbox = document.getElementById('node-ctx-start');
    const acceptingCheckbox = document.getElementById('node-ctx-accepting');

    startCheckbox.checked = !selectedStates.some(node => !node.classes().includes('start'));
    acceptingCheckbox.checked = !selectedStates.some(node => !node.classes().includes('accept'));

    startCheckbox.onchange = function() {
        if (startCheckbox.checked) {
            selectedStates.forEach(node => node.addClass('start'));
        } else {
            selectedStates.forEach(node => node.removeClass('start'));
        }
    };

    acceptingCheckbox.onchange = function() {
        if (acceptingCheckbox.checked) {
            selectedStates.forEach(node => node.addClass('accept'));
        } else {
            selectedStates.forEach(node => node.removeClass('accept'));
        }
    };

    document.getElementById('node-ctx-delete').addEventListener('click', function() {
        selectedStates.forEach(node => node.remove());
        clearSelection();
        ctxMenu.style.display = 'none';
    });
}

function showEdgeContextMenu(event) {
    const ctxMenu = document.getElementById('edge-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';

    document.getElementById('edge-ctx-delete').addEventListener('click', function() {
        selectedEdges.forEach(edge => edge.remove());
        clearSelection();
        ctxMenu.style.display = 'none';
    });
}

function showCommonContextMenu(event) {
    const ctxMenu = document.getElementById('common-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';

    document.getElementById('common-ctx-delete').addEventListener('click', function() {
        selectedEdges.forEach(edge => edge.remove());
        selectedStates.forEach(node => node.remove());
        clearSelection();
        ctxMenu.style.display = 'none';
    });
}

cy.on('cxttap', 'node', function(event) {
    const node = event.target;
    if (!selectedStates.includes(node)) {
        clearSelection();
        clearContextMenus();
        selectedStates = [node];
        node.addClass('node-selected');
        showNodeContextMenu(event.originalEvent);
    } else if (selectedEdges.length === 0) {
        showNodeContextMenu(event.originalEvent);
    } else {
        showCommonContextMenu(event.originalEvent);
    }
});

cy.on('cxttap', 'edge', function(event) {
    const edge = event.target;
    if (!selectedEdges.includes(edge)) {
        clearSelection();
        clearContextMenus();
        selectedEdges = [edge];
        edge.addClass('edge-selected');
        showEdgeContextMenu(event.originalEvent);
    } else if (selectedStates.length === 0) {
        showEdgeContextMenu(event.originalEvent);
    } else {
        showCommonContextMenu(event.originalEvent);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    renderAlphabet();
});

// TODO: undo/redo
