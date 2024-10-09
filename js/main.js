const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 20;

// Definir os custos dos terrenos
const terrenoCusto = {
  0: 5, // Grama
  1: 1, // Asfalto
  2: 3, // Terra
  3: 10, // Paralelepípedo
  4: Infinity, // Edifícios (intransponível)
};

// Localização dos amigos (corrigido)
const amigos = [
  { x: 12, y: 4 }, // Exemplo corrigido para o amigo 1
  { x: 8, y: 9 }, // Exemplo corrigido para o amigo 2
  { x: 34, y: 5 }, // Exemplo corrigido para o amigo 3
  { x: 37, y: 19 }, // Exemplo corrigido para o amigo 4
  { x: 14, y: 34 }, // Exemplo corrigido para o amigo 5
  { x: 36, y: 36 }, // Exemplo corrigido para o amigo 6
];

// Sortear quais amigos aceitarão o convite (três aleatórios)
function sortearAmigosAceitos() {
  let shuffledAmigos = amigos.sort(() => 0.5 - Math.random());
  return shuffledAmigos.slice(0, 3);
}

// Função para carregar o arquivo e converter para uma matriz
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

// Função para desenhar o mapa
function drawMap(grid) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      let color;
      switch (grid[y][x]) {
        case 0:
          color = "#84B026"; // Grama
          break;
        case 1:
          color = "#9B9B9B"; // Asfalto
          break;
        case 2:
          color = "#8C402E"; // Terra
          break;
        case 3:
          color = "#DFEBF2"; // Paralelepípedo
          break;
        case 4:
          color = "#F27C38"; // Edifícios (Obstáculo)
          break;
        case 5:
          color = "red"; // Amigos da Barbie (posição dos amigos)
          break;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      // Adicionar borda preta
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

// Função A*
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
        terrenoCusto[neighbor.cost] === Infinity ||
        closedList.some((n) => n.x === neighbor.x && n.y === neighbor.y)
      ) {
        continue; // Ignorar obstáculos (edifícios) ou nós já visitados
      }

      neighbor.g = currentNode.g + terrenoCusto[neighbor.cost];
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

// Função para desenhar o caminho encontrado de forma animada
function animatePath(path, delay = 200) {
  let totalCost = 0; // Reiniciar o custo total
  let index = 0;

  function drawStep() {
    if (index < path.length) {
      let node = path[index];

      // Atualizar o custo
      totalCost += node.cost;

      // Desenhar o movimento da Barbie
      ctx.fillStyle = "pink"; // Cor da Barbie
      ctx.fillRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);

      // Atualizar o custo total na interface
      document.getElementById("custoTotal").textContent = totalCost;

      // Próximo passo
      index++;

      // Continuar a animação após o intervalo
      setTimeout(drawStep, delay);
    }
  }

  // Iniciar a animação
  drawStep();
}

// Executa o algoritmo, visitando os amigos e retornando para a casa
loadGridFromFile("js/map.txt").then((grid) => {
  drawMap(grid);

  // Definir os amigos que aceitarão o convite
  const amigosAceitos = sortearAmigosAceitos();

  // Inicializar a busca a partir da casa da Barbie
  let startNode = new Node(18, 22, grid[18][22]); // Casa da Barbie (ponto inicial)

  // Função para visitar os amigos sequencialmente
  function visitarAmigos(i = 0) {
    if (i < amigosAceitos.length) {
      let amigo = amigosAceitos[i];
      let endNode = new Node(amigo.x, amigo.y, grid[amigo.y][amigo.x]);
      let path = astar(startNode, endNode, grid); // Calcula o caminho usando A*

      // Animar o caminho até o amigo
      animatePath(path, 200); // 200ms de atraso entre cada movimento

      // Após a animação, continuar com o próximo amigo
      setTimeout(() => {
        startNode = endNode; // Continuar a partir do último amigo visitado
        visitarAmigos(i + 1); // Próximo amigo
      }, path.length * 200); // Espera o tempo da animação
    } else {
      // Voltar para a casa da Barbie após visitar todos os amigos
      let returnHome = new Node(18, 22, grid[18][22]);
      let path = astar(startNode, returnHome, grid); // Caminho de volta

      // Animar o caminho de volta para casa
      animatePath(path, 200);
    }
  }

  // Começar a visita aos amigos
  visitarAmigos();
});
