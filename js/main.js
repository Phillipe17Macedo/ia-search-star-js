const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 20;

// Função para carregar o arquivo e converter para uma matriz
function loadGridFromFile(file) {
  return fetch(file)
    .then((response) => response.text())
    .then((data) => {
      // Divide o conteúdo do arquivo em linhas e converte cada linha em um array de números
      return data
        .trim()
        .split("\n")
        .map((line) => line.trim().split("").map(Number));
    });
}

// Função para desenhar o mapa
function drawMap(grid) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      let color;
      switch (grid[y][x]) {
        case 0:
          color = "green";
          break; // Grama
        case 1:
          color = "gray";
          break; // Asfalto
        case 2:
          color = "brown";
          break; // Terra
        case 3:
          color = "lightgray";
          break; // Paralelepípedo
        case 4:
          color = "orange";
          break; // Edifícios (Obstáculo)
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

// Função A* (igual ao seu código)
class Node {
  constructor(x, y, cost, parent = null) {
    this.x = x;
    this.y = y;
    this.cost = cost;
    this.parent = parent;
    this.g = 0; // Custo real
    this.h = 0; // Heurística
    this.f = 0; // Custo total (g + h)
  }
}

function astar(start, end, grid) {
  let openList = [];
  let closedList = [];

  openList.push(start);

  while (openList.length > 0) {
    let currentNode = openList.reduce((prev, curr) =>
      prev.f < curr.f ? prev : curr
    );

    if (currentNode.x === end.x && currentNode.y === end.y) {
      let path = [];
      let temp = currentNode;
      while (temp) {
        path.push(temp);
        temp = temp.parent;
      }
      return path.reverse();
    }

    openList = openList.filter((node) => node !== currentNode);
    closedList.push(currentNode);

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
        neighbor.cost === 4 ||
        closedList.some((n) => n.x === neighbor.x && n.y === neighbor.y)
      ) {
        continue; // Ignorar obstáculos (edifícios) ou nós já visitados
      }

      neighbor.g = currentNode.g + neighbor.cost;
      neighbor.h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y); // Heurística (Manhattan)
      neighbor.f = neighbor.g + neighbor.h;

      if (!openList.some((n) => n.x === neighbor.x && n.y === neighbor.y)) {
        neighbor.parent = currentNode;
        openList.push(neighbor);
      }
    }
  }

  return []; // Nenhum caminho encontrado
}

// Função para desenhar o caminho encontrado
function drawPath(path) {
  ctx.fillStyle = "pink"; // Cor da Barbie
  for (let node of path) {
    ctx.fillRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);
  }
}

loadGridFromFile("../js/map.txt").then((grid) => {
  drawMap(grid);

  // Inicializar a busca
  let startNode = new Node(19, 23, grid[19][23]); // Casa da Barbie (posição inicial)
  let endNode = new Node(0, 0, grid[0][0]); // Exemplo de destino (um amigo)
  let path = astar(startNode, endNode, grid); // Calcula o caminho usando A*

  drawPath(path); // Desenhar o caminho no mapa
});
