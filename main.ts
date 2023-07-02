
// This is simple a mindmap app
const map = document.getElementById('map')!;
const notes = document.getElementById('notes')!;

if (!map || !notes) {
  throw new Error('Missing map or notes');
}

// Class for a node
class MapNode {
  name: string;
  parent?: MapNode;
  children: MapNode[] = []
  element?: HTMLElement;

  constructor(name: string, parent?: MapNode) {
    this.name = name;
    this.parent = parent;
    this.children = [];
  }

  // add a child to the node
  addChild(name: string) {
    const node = new MapNode(name, this)
    this.children.push(node);
    return node;
  }
}

// Initial test data
const root = new MapNode('root');
const node1 = root.addChild('first');
const node2 = root.addChild('second');
const node3 = root.addChild('third');
const node31 = node3.addChild('third first');
notes.innerHTML = 'Press C to add a node, ESC to go back to the parent, N to focus the next sibling, P to focus the previous sibling, D to delete the focused node, T to add some test nodes, F to search for a node';

let focused = root;
let selected = node1;

const keyListeners = ([
  createNode,
  createTestNodes,
  deleteNode,
  focusNextNode,
  focusParentNode,
  focusPreviousNode,
  focusSelectedNode,
  searchNodes,
  selectNextNode,
  selectPreviousNode,
] as EventListener[]).map(stopPropagation);

function stopPropagation(listener: EventListener) {
  return (event: Event) => {
    event.stopPropagation();
    return listener(event);
  };
}

function registerListeners() {
  map.addEventListener('click', focusedNode);
  keyListeners.forEach((listener) => {
    document.addEventListener('keydown', listener);
  });
}

function removeListeners() {
  // map.removeEventListener('click', focusedNode);
  keyListeners.forEach((listener) => {
    document.removeEventListener('keydown', listener);
  });
}

// When a node is clicked, it becomes the focused node
function focusedNode(event: MouseEvent) {
  const node = event.target as HTMLElement;
  if (node?.classList?.contains('circle')) {
    const name = node.innerHTML;
    focused = findNode(name) ?? focused;
    map.innerHTML = '';
    drawNodes();
  }
}

// When ESC is pressed, the focused node goes back to the parent
function focusParentNode(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (focused.parent) {
      focused = focused.parent;
      selectFirstChild(focused);
      map.innerHTML = '';
      drawNodes();
    }
  }
}

// When C is pressed, a new node is added to the focused node
// An input is shown to enter the name of the node
function createNode(event: KeyboardEvent) {
  if (event.key === 'c') {
    const name = prompt('Enter name');
    if (name) {
      const created = focused.addChild(name);
      selectNode(created);
      map.innerHTML = '';
      drawNodes();
    }
  }
}

// When N or J is pressed, the next children is selected.
// Selecting a node means it is highlighted and the notes are updated
function selectNextNode(event: KeyboardEvent) {
  if (event.key === 'n' || event.key === 'j') {
    const index = focused.children.indexOf(selected);
    if (index === -1) {
      return;
    }
    let next;
    if (index === focused.children.length - 1) {
      next = focused.children[0];
    } else {
      next = focused.children[index + 1];
    }
    selectNode(next);
    /* updateNotes(); */
  }
}

// When J or K is pressed, the previous children is selected.
function selectPreviousNode(event: KeyboardEvent) {
  if (event.key === 'p' || event.key === 'k') {
    const index = focused.children.indexOf(selected);
    if (index === -1) {
      return;
    }
    let next;
    if (index === 0) {
      next = focused.children[focused.children.length - 1];
    } else {
      next = focused.children[index - 1];
    }
    /* updateNotes(); */
    selectNode(next);
  }
}

// When Enter is pressed, the selected node becomes the focused node
function focusSelectedNode(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    focused = selected;
    selectFirstChild(selected);
    map.innerHTML = '';
    drawNodes();
  }
}

// When shift + N is pressed, the next sibling of the focused node is focused
// If there is no next sibling, the first sibling is focused
// If there is no sibling, show a quick message that fades away after 1 second
function focusNextNode(event: KeyboardEvent) {
  if (event.shiftKey && (event.key === 'n' || event.key === 'j')) {
    if (!focused.parent || focused.parent.children.length === 1) {
      showNotification('No siblings');
      return;
    }

    const siblings = focused.parent.children;
    const index = siblings.indexOf(focused);
    focused = (index === siblings.length - 1) ? siblings[0] : siblings[index + 1];
    selectFirstChild(selected);
    map.innerHTML = '';
    drawNodes();
  }
}

// When shift + P is pressed, the previous sibling of the focused node is focused
// If there is no previous sibling, the last sibling is focused
// If there is no sibling, show a quick message that fades away after 1 second
function focusPreviousNode(event: KeyboardEvent) {
  if (event.shiftKey && (event.key === 'p' || event.key === 'k')) {
    if (!focused.parent || focused.parent.children.length === 1) {
      showNotification('No siblings');
      return;
    }

    const siblings = focused.parent.children;
    const index = siblings.indexOf(focused) ?? -1;
    focused = (index === 0) ? siblings[siblings.length - 1] : siblings[index - 1];
    selectFirstChild(focused);
    map.innerHTML = '';
    drawNodes();
  }
}

// when T is pressed, some fake data is added to the focused node
function createTestNodes(event: KeyboardEvent) {
  if (event.key === 't') {
    focused.addChild('fake 1');
    focused.addChild('fake 2');
    focused.addChild('fake 3');
    map.innerHTML = '';
    drawNodes();
  }
}

// when D is pressed, the focused node is deleted
function deleteNode(event: KeyboardEvent) {
  if (event.key === 'd') {
    if (focused.parent) {
      const index = focused.parent.children.indexOf(focused);
      focused.parent.children.splice(index, 1);
      focused = focused.parent;
      map.innerHTML = '';
      drawNodes();
    } else {
      showNotification('Cannot delete root');
    }
  }
}

function selectFirstChild(node: MapNode) {
  removeHighlight(selected);
  if (node.children.length > 0) {
    selected = node.children[0];
    highlight(selected);
  }
}

// when F is pressed, a search input is shown
// the input provides autocomplete with the names of the nodes
// when a node is focused, it becomes the focused node
function searchNodes(event: KeyboardEvent) {
  event.preventDefault();
  if (event.key === 'f') {
    removeListeners();
    const input = document.createElement('input');
    input.classList.add('search');
    input.placeholder = 'Search';
    map.appendChild(input);
    input.focus();

    const list = document.createElement('ul');
    input.addEventListener('keyup', (event) => {
      event.stopPropagation();
      // when Enter is pressed, focus the first result
      if (event.key === 'Enter') {
        const result = document.querySelector('.results li');
        if (result) {
          const name = result.innerHTML;
          focused = findNode(name) ?? focused;
          registerListeners();
          map.innerHTML = '';
          drawNodes();
          return;
        }
      }

      // clear list
      list.innerHTML = '';

      if (!event.target) {
        return;
      }

      const value = (event.target as HTMLInputElement).value;
      const results = findNodes(value);
      list.classList.add('results');
      results.forEach((result) => {
        const item = document.createElement('li');
        item.innerHTML = result.name;
        list.appendChild(item);
      });
      map.appendChild(list);
    });
  }
}

function showNotification(message: string) {
  const messageElement = document.createElement('div');
  messageElement.innerHTML = message;
  messageElement.classList.add('notification');
  map.appendChild(messageElement);
  setTimeout(() => {
    messageElement.classList.add('fade');
  }, 1000);
  // remove div after 1 second
  setTimeout(() => {
    map.removeChild(messageElement);
  }, 2000);
}

function saveToLocalStorage() {
  // marshall root to JSON
  // can't stringify because of circular references
  const data = JSON.stringify(root, (key, value) => {
    if (key === 'parent') {
      return undefined;
    }
    return value;
  });
  console.log(data)
  /* localStorage.setItem('remap.rodweb.app', data); */
}

function loadFromLocalStorage() {
  const data = localStorage.getItem('mindmap.rodweb.app');
  if (!data) {
    return;
  }
  try {
    const parsed = JSON.parse(data);
    console.log(parsed);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function findNode(name: string, node: MapNode = root): MapNode | null {
  if (node.name === name) {
    return node;
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const found = findNode(name, child);
    if (found) {
      return found;
    }
  }
  return null;
}

function findNodes(partialName: string) {
  const results: MapNode[] = [];
  function find(node: MapNode) {
    if (node.name.includes(partialName)) {
      if (node !== root) {
        results.push(node);
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      find(child);
    }
  }
  find(root);
  return results;
}

/* Draw nodes as circles
   Root node is in the center
   Children are drawn in a circle around the parent
   Children of children are not drawn
   When a children is focused, it goes to the center
 */
function drawNodes() {
  drawNode(focused);
  // drawn children
  focused.children.forEach((child, index) => {
    // find parent x,y based on screen size
    const parentX = window.innerWidth / 2;
    const parentY = window.innerHeight / 2;

    let angle = (index / focused.children.length) * 2 * Math.PI;
    // update the angle so the first child is on top
    angle -= Math.PI / 2;
    const x = parentX + 200 * Math.cos(angle);
    const y = parentY + 200 * Math.sin(angle);

    drawNode(child, x, y);
    drawLine({ x: parentX, y: parentY }, { x, y }, angle);
  });
}

function selectNode(node: MapNode) {
  removeHighlight(selected);
  selected = node;
  highlight(selected);
}

function removeHighlight(node: MapNode) {
  if (node.element) {
    node.element.classList.remove('selected');
  }
}

function highlight(node: MapNode) {
  if (node.element) {
    node.element.classList.add('selected');
  }
}

function drawNode(node: MapNode, x?: number, y?: number) {
  const nodeElement = document.createElement('div');
  nodeElement.classList.add('circle');
  if (node === focused) {
    nodeElement.classList.add('focused');
  }
  else if (node === selected) {
    nodeElement.classList.add('selected');
  }
  nodeElement.innerHTML = node.name;
  if (!x || !y) {
    nodeElement.style.left = x + 'px';
    nodeElement.style.top = y + 'px';
  }
  map.appendChild(nodeElement);
  node.element = nodeElement;
}

// draw an angled line between two nodes
function drawLine(from: { x: number, y: number }, to: { x: number, y: number }, angle: number) {
  const lineElement = document.createElement('div');
  const left = (from.x + to.x) / 2 - 50 * Math.cos(angle);
  const top = (from.y + to.y) / 2 - 50 * Math.sin(angle);
  lineElement.style.position = 'absolute';
  lineElement.style.left = left + 'px';
  lineElement.style.top = top + 'px';
  lineElement.style.width = '100px';
  lineElement.style.height = '1px';
  lineElement.style.backgroundColor = 'black';
  lineElement.style.transformOrigin = '0 0';
  lineElement.style.transform = `rotate(${angle}rad)`;
  map.appendChild(lineElement);
}

function init() {
  drawNodes();
  registerListeners();
}

init();

