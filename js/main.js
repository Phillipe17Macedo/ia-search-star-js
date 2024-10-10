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
          color = "red";
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

function animatePath(path, delay = 200, amigo = null, returning = false) {
  let totalCost = 0;
  let index = 0;
  const costList = document.getElementById("costList");

  function drawStep() {
    if (index < path.length) {
      let node = path[index];

      totalCost += node.cost;

      // Se está voltando, restaurar a cor original
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

        // Tocar som ao encontrar o amigo
        encontrarAmigoSound.play();
      } else if (returning) {
        // Tocar som ao retornar para casa
        voltarParaCasaSound.play();
      }
    }
  }

  drawStep();
}

function tentarConvencerAmigo(amigo) {
  return Math.random() > 0.5;
}

loadGridFromFile("js/map.txt").then((grid) => {
  drawMap(grid);

  const amigosAceitos = sortearAmigosAceitos();

  document.getElementById("amigosSorteados").textContent = amigosAceitos
    .map((amigo) => amigo.nome)
    .join(", ");

  let startNode = new Node(18, 22, grid[18][22]); // Casa da Barbie (ponto inicial)
  let amigosEncontrados = [];

  amigosAceitos.forEach((amigo, index) => {
    if (amigo.x === startNode.x && amigo.y === startNode.y) {
      amigosEncontrados.push(amigo.nome);
      amigosAceitos.splice(index, 1);
    }
  });

  document.getElementById("amigosEncontrados").textContent =
    amigosEncontrados.join(", ");

  function visitarAmigos(i = 0) {
    if (i < amigosAceitos.length) {
      let amigo = amigosAceitos[i];
      let endNode = new Node(amigo.x, amigo.y, grid[amigo.y][amigo.x]);
      let path = astar(startNode, endNode, grid);

      animatePath(path, 200, amigo);

      setTimeout(() => {
        amigosEncontrados.push(amigo.nome);
        document.getElementById("amigosEncontrados").textContent =
          amigosEncontrados.join(", ");

        startNode = endNode;
        visitarAmigos(i + 1);
      }, path.length * 200);
    } else {
      let returnHome = new Node(18, 22, grid[18][22]);
      let path = astar(startNode, returnHome, grid);

      // Animar a volta restaurando as cores originais
      animatePath(path, 200, null, true);
      setTimeout(() => {
        const finalCost = document.getElementById("finalCost");
        finalCost.textContent =
          document.getElementById("custoTotal").textContent;
      }, path.length * 200);
    }
  }

  visitarAmigos();
});
