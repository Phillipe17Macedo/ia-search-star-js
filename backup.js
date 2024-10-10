const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 20;

const barbieImg = document.getElementById("barbieImage");

const terrenoCusto = {
  0: 5, // Grama
  1: 1, // Asfalto
  2: 3, // Terra
  3: 10, // Paralelepípedo
  4: Infinity, // Edifícios (intransponível)
};

// Localização de apenas um amigo para teste
const amigoTeste = { x: 36, y: 36, nome: "Amigo 1" }; // Você pode mudar as coordenadas para testar outro amigo

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
          color = "red";
          break;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
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
        terrenoCusto[neighbor.cost] === Infinity ||
        closedList.some((n) => n.x === neighbor.x && n.y === neighbor.y)
      ) {
        continue;
      }

      neighbor.g = currentNode.g + terrenoCusto[neighbor.cost];
      neighbor.h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
      neighbor.f = neighbor.g + neighbor.h;

      if (!openList.some((n) => n.x === neighbor.x && n.y === neighbor.y)) {
        neighbor.parent = currentNode;
        openList.push(neighbor);
      }
    }
  }

  return []; // Nenhum caminho encontrado
}

function animatePath(path, delay = 200, amigo = null) {
  let totalCost = 0; // Reiniciar o custo total
  let index = 0;

  function drawStep() {
    if (index < path.length) {
      let node = path[index];

      totalCost += node.cost;

      ctx.fillStyle = "lightpink";
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
    }
  }

  drawStep();
}

// Função para tentar convencer o amigo
function tentarConvencerAmigo(amigo) {
  return Math.random() > 0.5;
}

// Função principal para executar o algoritmo, visitando apenas um amigo
loadGridFromFile("js/map.txt").then((grid) => {
  drawMap(grid);

  // Inicializar a busca a partir da casa da Barbie
  let startNode = new Node(18, 22, grid[18][22]); // Casa da Barbie (ponto inicial)

  // Visitar apenas o amigo de teste
  let endNode = new Node(amigoTeste.x, amigoTeste.y, grid[amigoTeste.y][amigoTeste.x]);
  let path = astar(startNode, endNode, grid); // Calcula o caminho usando A*

  // Animar o caminho até o amigo
  animatePath(path, 200, amigoTeste); // 200ms de atraso entre cada movimento
});
