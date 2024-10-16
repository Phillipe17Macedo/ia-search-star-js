const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 20;

//icone Barbie
const barbieImg = document.getElementById("barbieImage");

// Adicionar sons
const encontrarAmigoSound = document.getElementById("encontrarAmigoSound");
const voltarParaCasaSound = document.getElementById("voltarParaCasaSound");

const terrenoCusto = {
  0: 5, // Grama
  1: 1, // Asfalto
  2: 3, // Terra
  3: 10, // Paralelepípedo
  4: Infinity, // Edifícios (intransponível)
};

let gridState = []; // Variável para armazenar o estado original do grid (as cores)

// Localização dos amigos (corrigido)
const amigos = [
  { x: 12, y: 4, nome: "Amigo 1" },
  { x: 8, y: 9, nome: "Amigo 2" },
  { x: 34, y: 5, nome: "Amigo 3" },
  { x: 37, y: 23, nome: "Amigo 4" },
  { x: 14, y: 35, nome: "Amigo 5" },
  { x: 36, y: 36, nome: "Amigo 6" },
];

class MinHeap {
  constructor() {
    this.heap = [];
  }

  insert(node) {
    this.heap.push(node);
    this.bubbleUp();
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].f >= this.heap[parentIndex].f) break;
      [this.heap[index], this.heap[parentIndex]] = [
        this.heap[parentIndex],
        this.heap[index],
      ];
      index = parentIndex;
    }
  }

  extractMin() {
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }

  bubbleDown(index) {
    let smallest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;

    if (left < this.heap.length && this.heap[left].f < this.heap[smallest].f) {
      smallest = left;
    }

    if (
      right < this.heap.length &&
      this.heap[right].f < this.heap[smallest].f
    ) {
      smallest = right;
    }

    if (smallest !== index) {
      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      this.bubbleDown(smallest);
    }
  }

  size() {
    return this.heap.length;
  }
}

function sortearAmigosAceitos() {
  let shuffledAmigos = amigos.sort(() => 0.5 - Math.random());
  return shuffledAmigos.slice(0, 3);
}

function loadGridFromFile(file) {
  return fetch(file)
    .then((response) => response.text())
    .then((data) => {
      return data
        .trim()
        .split("\n")
        .map((line) => line.trim().split("").map(Number));
    });
}

function drawMap(grid) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      let color;
      switch (grid[y][x]) {
        case 0:
          color = "#84B026";
          break;
        case 1:
          color = "#9B9B9B";
          break;
        case 2:
          color = "#8C402E";
          break;
        case 3:
          color = "#DFEBF2";
          break;
        case 4:
          color = "#F27C38";
          break;
        case 5:
          color = "#011640";
          break;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

      // Salvar o estado inicial da célula (cor original)
      if (!gridState[y]) {
        gridState[y] = [];
      }
      gridState[y][x] = color;
    }
  }
}

class Node {
  constructor(x, y, cost, parent = null) {
    this.x = x;
    this.y = y;
    this.cost = cost;
    this.parent = parent;
    this.g = 0;
    this.h = 0;
    this.f = 0;
  }
}

function astar(start, end, grid) {
  let openList = new MinHeap();
  let closedSet = new Set();

  openList.insert(start);

  while (openList.size() > 0) {
    let currentNode = openList.extractMin();

    if (currentNode.x === end.x && currentNode.y === end.y) {
      let path = [];
      let temp = currentNode;
      while (temp) {
        path.push(temp);
        temp = temp.parent;
      }
      return path.reverse();
    }

    closedSet.add(`${currentNode.x}-${currentNode.y}`);

    let neighbors = [];
    if (currentNode.x + 1 < 42)
      neighbors.push(
        new Node(
          currentNode.x + 1,
          currentNode.y,
          grid[currentNode.y][currentNode.x + 1]
        )
      );
    if (currentNode.x - 1 >= 0)
      neighbors.push(
        new Node(
          currentNode.x - 1,
          currentNode.y,
          grid[currentNode.y][currentNode.x - 1]
        )
      );
    if (currentNode.y + 1 < 42)
      neighbors.push(
        new Node(
          currentNode.x,
          currentNode.y + 1,
          grid[currentNode.y + 1][currentNode.x]
        )
      );
    if (currentNode.y - 1 >= 0)
      neighbors.push(
        new Node(
          currentNode.x,
          currentNode.y - 1,
          grid[currentNode.y - 1][currentNode.x]
        )
      );

    for (let neighbor of neighbors) {
      if (
        terrenoCusto[neighbor.cost] === Infinity ||
        closedSet.has(`${neighbor.x}-${neighbor.y}`)
      ) {
        continue;
      }

      neighbor.g = currentNode.g + terrenoCusto[neighbor.cost];
      neighbor.h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
      neighbor.f = neighbor.g + neighbor.h;

      if (
        ![...openList.heap].some(
          (n) => n.x === neighbor.x && n.y === neighbor.y
        )
      ) {
        neighbor.parent = currentNode;
        openList.insert(neighbor);
      }
    }
  }

  return []; // Nenhum caminho encontrado
}

function animatePath(path, delay = 200, amigo = null, returning = false) {
  let totalCost = 0;
  let index = 0;
  const costList = document.getElementById("costList");

  function drawStep() {
    if (index < path.length) {
      let node = path[index];

      totalCost += node.cost;

      if (returning) {
        ctx.fillStyle = gridState[node.y][node.x];
      } else {
        ctx.fillStyle = "lightpink";
      }

      ctx.fillRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);
      ctx.strokeRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);

      ctx.drawImage(
        barbieImg,
        node.x * tileSize,
        node.y * tileSize,
        tileSize,
        tileSize
      );

      document.getElementById("custoTotal").textContent = totalCost;

      index++;

      setTimeout(drawStep, delay);
    } else {
      if (amigo) {
        const listItem = document.createElement("li");
        listItem.textContent = `${amigo.nome}: Custo ${totalCost}`;
        costList.appendChild(listItem);
        encontrarAmigoSound.play();
      } else if (returning) {
        voltarParaCasaSound.play();
      }
    }
  }

  drawStep();
}

function tentarConvencerAmigo(amigo) {
  return Math.random() > 0.5;
}

loadGridFromFile("js/map.txt")
  .then((grid) => {
    console.log("Mapa carregado com sucesso");
    drawMap(grid);

    let startNode = new Node(18, 22, grid[18][22]); // Casa da Barbie (ponto inicial)

    // Determinar a ordem dos amigos usando uma heurística mais rápida
    let ordemOtima = calcularOrdemHeuristica(amigos, startNode);

    let amigosEncontrados = [];

    function visitarAmigos(i = 0) {
      if (i < ordemOtima.length) {
        let amigo = ordemOtima[i];
        let endNode = new Node(amigo.x, amigo.y, grid[amigo.y][amigo.x]);
        let path = astar(startNode, endNode, grid);

        if (path.length === 0) {
          console.error("Nenhum caminho encontrado para:", amigo.nome);
          return;
        }

        animatePath(path, 100, amigo); // Reduzindo o delay para 100ms

        setTimeout(() => {
          amigosEncontrados.push(amigo.nome);
          document.getElementById("amigosEncontrados").textContent =
            amigosEncontrados.join(", ");

          startNode = endNode;
          visitarAmigos(i + 1);
        }, path.length * 100); // Ajustado para garantir que a Barbie chegue ao amigo antes de continuar
      } else {
        let returnHome = new Node(18, 22, grid[18][22]);
        let path = astar(startNode, returnHome, grid);

        if (path.length === 0) {
          console.error("Nenhum caminho encontrado de volta para casa");
          return;
        }

        animatePath(path, 200, null, true);
        setTimeout(() => {
          const finalCost = document.getElementById("finalCost");
          finalCost.textContent =
            document.getElementById("custoTotal").textContent;
        }, path.length * 100);
      }
    }

    visitarAmigos();
  })
  .catch((error) => {
    console.error("Erro ao carregar o mapa:", error);
  });

function calcularOrdemHeuristica(amigos, startNode) {
  let ordem = [];
  let naoVisitados = [...amigos];
  let atual = startNode;

  while (naoVisitados.length > 0) {
    let menorDistancia = Infinity;
    let proximoAmigo = null;
    let proximoIndex = -1;

    // Calcular a distância de cada amigo não visitado usando a distância Manhattan
    naoVisitados.forEach((amigo, index) => {
      let distancia = Math.abs(amigo.x - atual.x) + Math.abs(amigo.y - atual.y);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        proximoAmigo = amigo;
        proximoIndex = index;
      }
    });

    if (proximoAmigo) {
      ordem.push(proximoAmigo);
      naoVisitados.splice(proximoIndex, 1);
      atual = new Node(proximoAmigo.x, proximoAmigo.y, 0);
    }
  }

  return ordem;
}
