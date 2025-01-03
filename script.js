const alphabet = ['0', '1'];

let selectedStates = [];
let selectedEdges = [];

function clearSelection() {
    selectedStates.forEach(n => n.removeClass('state-selected'));
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
                'width': 36,
                'height': 36,
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
            selector: '.state-selected',
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
            selector: '.phantom-state',
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

function uniqueStateName() {
    const stateNames = cy.nodes().map(state => state.data().label);
    let i = 0;
    while (stateNames.includes(`q${i}`)) {
        i += 1;
    }
    return `q${i}`;
}

function phantomEdges() {
    return cy.edges().filter(edge => edge.classes().includes('phantom-edge'));
}

function phantomStates() {
    return cy.nodes().filter(state => state.classes().includes('phantom-state'));
}

function addState() {
    const newName = uniqueStateName();
    cy.add({ group: 'nodes', data: { id: newName, label: newName } });
    updateDeterminismIndicator();
    return cy.getElementById(newName);
}

cy.on('tap', 'node', function (event) {
    clearContextMenus();
    if (isCreatingTransition) {
        if (phantomStates().includes(event.target)) {
            // clicked on phantom state
            event.target.removeClass('phantom-state');
            event.target.data('label', event.target.id());
            phantomEdges().forEach(edge => edge.removeClass('phantom-edge'));
        } else {
            // clicked on existing state
            phantomStates().forEach(state => state.remove());
            phantomEdges().forEach(edge => edge.removeClass('phantom-edge'));
        }
        isCreatingTransition = false;
        updateDeterminismIndicator();
        clearSelection();
    } else {
        const state = event.target;
        if (event.originalEvent.shiftKey) {
            if (selectedStates.includes(state)) {
                selectedStates.splice(selectedStates.indexOf(state), 1);
                state.removeClass('state-selected');
            } else {
                selectedStates.push(state);
                state.addClass('state-selected');
            }
        } else {
            selectedStates.forEach(n => n.removeClass('state-selected'));
            selectedEdges.forEach(n => n.removeClass('edge-selected'));
            selectedStates = [state];
            selectedEdges = [];
            state.addClass('state-selected');
        }
    }
});

cy.on('tap', 'edge', function (event) {
    clearContextMenus();
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
        clearSelection();
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
            phantomStates().forEach(state => state.remove());
            phantomEdges().forEach(edge => edge.remove());
            updateDeterminismIndicator();
            isCreatingTransition = false;
        }
    }
    if (selectedStates.length > 0) {
        if (alphabet.includes(event.key)) {
            isCreatingTransition = true;
            const pos = selectedStates[0].position();
            const phantomState = addState();
            phantomState.addClass('phantom-state');
            phantomState.position({ x: pos.x + 5, y: pos.y + 5 });
            selectedStates.forEach(state => {
                cy.add([
                    { group: 'edges', data: { source: state.id(), target: phantomState.id(), label: event.key }, classes: 'phantom-edge' }
                ]);
            });
        } else {
            // TODO: suggest adding symbol to alphabet
        }
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
    const phantomState = phantomStates()[0];
    phantomState.position(canvasPosition(event.clientX, event.clientY));
    const regularStates = cy.nodes().filter(state => state !== phantomState);
    for (const state of regularStates) {
        const bbox = state.renderedBoundingBox();
        if (event.clientX >= bbox.x1 && event.clientX <= bbox.x2 && event.clientY >= bbox.y1 && event.clientY <= bbox.y2) {
            phantomEdges().forEach(edge => {
                const data = edge.data();
                edge.remove();
                cy.add({ group: 'edges', data: { id: data.id, source: data.source, target: state.id(), label: data.label }, classes: 'phantom-edge' });
            })
            phantomState.addClass('invisible');
            updateDeterminismIndicator();
            return;
        }
    }
    phantomEdges().forEach(edge => {
        const data = edge.data();
        edge.remove();
        cy.add({ group: 'edges', data: { id: data.id, source: data.source, target: phantomState.id(), label: data.label }, classes: 'phantom-edge' });
    });
    phantomState.removeClass('invisible');
    updateDeterminismIndicator();
});

let addAlphabetItemInputVisible = false;

document.querySelector('#add-alphabet-item-button').addEventListener('click', function () {
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
        listItem.style.minWidth = '36px';
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
            // TODO: error when alphabet becomes empty
            validateInputWord();
            updateDeterminismIndicator();
        })
        alphabetContainer.appendChild(listItem);
    });
}

function addAlphabetItem(symbol) {
    alphabet.push(symbol);
    alphabet.sort();
    renderAlphabet();
    validateInputWord();
    updateDeterminismIndicator();
}

document.querySelector('#add-alphabet-item-input').addEventListener('input', function (event) {
    const symbol = event.target.value;
    if (symbol.length === 1) {
        if (symbol.trim() === '') {
            // TODO: error, symbol must not be whitespace
            return;
        }
        if (alphabet.includes(symbol)) {
            // TODO: error, no duplicates allowed
            return;
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

function updateDeterminismIndicator() {
    function setIndicatorDFA() {
        const indicator = document.getElementById('determinism-indicator');
        indicator.classList.remove('text-bg-primary');
        indicator.classList.add('text-bg-success');
        indicator.textContent = 'DFA';
    }
    
    function setIndicatorNFA() {
        const indicator = document.getElementById('determinism-indicator');
        indicator.classList.remove('text-bg-success');
        indicator.classList.add('text-bg-primary');
        indicator.textContent = 'NFA';
    }
    
    function isDeterministic() {
        const transitionsMap = new Map();
        
        let startingStateFound = false;
        for (const state of cy.nodes()) {
            if (state.classes().includes('start')) {
                if (startingStateFound) {
                    return false;
                }
                startingStateFound = true;
            }
            transitionsMap.set(state.id(), new Map());
        }
        
        for (const edge of cy.edges()) {
            const source = edge.data().source;
            const target = edge.data().target;
            // TODO: adjust implementation for transitions with multiple symbols
            const symbol = edge.data().label;
            const symbolsMap = transitionsMap.get(source);
            if (symbolsMap.has(symbol)) {
                return false;
            }
            symbolsMap.set(symbol, target);
        }
        
        for (const [_, symbolsSet] of transitionsMap.entries()) {
            for (const symbol of alphabet) {
                if (!symbolsSet.has(symbol)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    if (isDeterministic()) {
        setIndicatorDFA();
    } else {
        setIndicatorNFA();
    }
}

document.querySelector('#sidebar').addEventListener('click', function () {
    clearSelection();
});

function clearContextMenus() {
    document.getElementById('edge-context-menu').style.display = 'none';
    document.getElementById('state-context-menu').style.display = 'none';
    document.getElementById('common-context-menu').style.display = 'none';
    document.getElementById('canvas-context-menu').style.display = 'none';
}

function initContextMenuListeners() {
    document.getElementById('state-ctx-delete').addEventListener('click', function () {
        selectedStates.forEach(state => state.remove());
        clearSelection();
        clearContextMenus();
        updateDeterminismIndicator();
    });
    document.getElementById('edge-ctx-delete').addEventListener('click', function () {
        selectedEdges.forEach(edge => edge.remove());
        clearSelection();
        clearContextMenus();
        updateDeterminismIndicator();
    });
    document.getElementById('common-ctx-delete').addEventListener('click', function () {
        selectedEdges.forEach(edge => edge.remove());
        selectedStates.forEach(state => state.remove());
        clearSelection();
        clearContextMenus();
        updateDeterminismIndicator();
    });
    document.getElementById('canvas-ctx-new-state').addEventListener('click', function () {
        const ctxMenu = document.getElementById('canvas-context-menu');
        const rect = ctxMenu.getBoundingClientRect();
        const newState = addState();
        newState.position(canvasPosition(rect.left + 10, rect.top + 10));
        ctxMenu.style.display = 'none';
        clearSelection();
        clearContextMenus();
    });
}

function showStateContextMenu(event) {
    const ctxMenu = document.getElementById('state-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';

    const startCheckbox = document.getElementById('state-ctx-start');
    const acceptingCheckbox = document.getElementById('state-ctx-accepting');

    startCheckbox.checked = selectedStates.every(state => state.classes().includes('start'));
    acceptingCheckbox.checked = selectedStates.every(state => state.classes().includes('accept'));

    startCheckbox.onchange = function () {
        if (startCheckbox.checked) {
            selectedStates.forEach(state => state.addClass('start'));
        } else {
            // TODO: error when there are no start states
            selectedStates.forEach(state => state.removeClass('start'));
        }
    };

    acceptingCheckbox.onchange = function () {
        if (acceptingCheckbox.checked) {
            selectedStates.forEach(state => state.addClass('accept'));
        } else {
            selectedStates.forEach(state => state.removeClass('accept'));
        }
    };
}

function showEdgeContextMenu(event) {
    const ctxMenu = document.getElementById('edge-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';
}

function showCommonContextMenu(event) {
    const ctxMenu = document.getElementById('common-context-menu');
    ctxMenu.style.top = event.pageY + 'px';
    ctxMenu.style.left = event.pageX + 'px';
    ctxMenu.style.width = '100px';
    ctxMenu.style.display = 'block';
}

cy.on('cxttap', 'node', function (event) {
    const state = event.target;
    clearContextMenus();
    if (!selectedStates.includes(state)) {
        clearSelection();
        clearContextMenus();
        selectedStates = [state];
        state.addClass('state-selected');
        showStateContextMenu(event.originalEvent);
    } else if (selectedEdges.length === 0) {
        showStateContextMenu(event.originalEvent);
    } else {
        showCommonContextMenu(event.originalEvent);
    }
});

cy.on('cxttap', 'edge', function (event) {
    const edge = event.target;
    clearContextMenus();
    if (!selectedEdges.includes(edge)) {
        clearSelection();
        selectedEdges = [edge];
        edge.addClass('edge-selected');
        showEdgeContextMenu(event.originalEvent);
    } else if (selectedStates.length === 0) {
        showEdgeContextMenu(event.originalEvent);
    } else {
        showCommonContextMenu(event.originalEvent);
    }
});

cy.on('cxttap', function (event) {
    if (event.target === cy) {
        const ctxMenu = document.getElementById('canvas-context-menu');
        clearContextMenus();
        clearSelection();
        ctxMenu.style.top = event.originalEvent.pageY + 'px';
        ctxMenu.style.left = event.originalEvent.pageX + 'px';
        ctxMenu.style.width = '100px';
        ctxMenu.style.display = 'block';
    }
});

function validateInputWord() {
    const inputField = document.getElementById('input-word');
    const errorText = document.getElementById('input-word-error-text');
    const illegalChars = [...new Set(inputField.value.split('').filter(char => !alphabet.includes(char)))];
    if (illegalChars.length > 0) {
        // TODO: disable play button
        errorText.style.display = 'block';
        errorText.textContent = `${illegalChars.map(char => `'${char}'`).join(', ')} not in alphabet`;
        return false;
    } else {
        errorText.style.display = 'none';
        return true;
    }
}

document.getElementById('input-word').addEventListener('input', function () {
    validateInputWord();
});

let simulationSpeed = 1; // integer between 1-15
let simulationWordRemainder = '';
let simulationCurrentStates = [];
let isSimulationPlaying = false;
// TODO: show previous state(s) and transition(s) in simulation?

document.getElementById('simulation-speed').addEventListener('input', function (event) {
    simulationSpeed = Number(event.target.value);
});

function simulationSleepTime() {
    switch (simulationSpeed) {
        case 1: return 5000;
        case 2: return 4000;
        case 3: return 3000;
        case 4: return 2000;
        case 5: return 1000;
        case 6: return 800;
        case 7: return 700;
        case 8: return 600;
        case 9: return 500;
        case 10: return 400;
        case 11: return 300;
        case 12: return 240;
        case 13: return 120;
        case 14: return 60;
        default: return 0;
    }
}

document.getElementById('simulation-play-button').addEventListener('click', async function () {
    if (isSimulationPlaying) {
        // TODO: pause simulation
        return;
    }
    if (!validateInputWord()) {
        return;
    }
    simulationSpeed = Number(document.getElementById('simulation-speed').value);
    // TODO: make sure automaton is valid (i.e. has at least one start state and at least one symbol in the alphabet)
    isSimulationPlaying = true;
    document.getElementById('simulation-play-button').innerHTML = '<span class="fas fa-pause"></span>';
    simulationWordRemainder = document.getElementById('input-word').value;
    cy.nodes().forEach(state => state.removeClass('current-simulation-state'));
    simulationCurrentStates = cy.nodes().filter(state => state.classes().includes('start'));
    simulationCurrentStates.forEach(state => state.addClass('current-simulation-state'));
    while (simulationWordRemainder !== '') {
        await new Promise(resolve => setTimeout(resolve, simulationSleepTime())); // sleep
        const symbol = simulationWordRemainder[0];
        simulationCurrentStates = cy.edges()
            // TODO: adjust implementation for transitions with multiple symbols
            .filter(edge => simulationCurrentStates.map(state => state.id()).includes(edge.data().source) && edge.data().label === symbol)
            .map(edge => cy.nodes().find(state => state.id() === edge.data().target));
        cy.nodes().forEach(state => state.removeClass('current-simulation-state'));
        simulationCurrentStates.forEach(state => state.addClass('current-simulation-state'));
        simulationWordRemainder = simulationWordRemainder.substring(1);
    }
    document.getElementById('simulation-play-button').innerHTML = '<span class="fas fa-play"></span>';
    isSimulationPlaying = false;
    // TODO: output whether the word was accepted or not
});

document.getElementById('simulation-stop-button').addEventListener('click', function () {
    simulationWordRemainder = '';
    simulationCurrentStates = [];
    cy.nodes().forEach(state => state.removeClass('current-simulation-state'));
    document.getElementById('simulation-play-button').innerHTML = '<span class="fas fa-play"></span>';
    isSimulationPlaying = false;
})

document.addEventListener('DOMContentLoaded', function () {
    initContextMenuListeners();
    renderAlphabet();
    updateDeterminismIndicator();
});

// TODO: undo/redo
