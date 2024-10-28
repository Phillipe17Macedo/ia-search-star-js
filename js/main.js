// Obtendo o canvas onde o mapa do jogo será desenhado e definindo o contexto 2D
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 20; // Tamanho de cada bloco no grid do mapa

// Variáveis globais para armazenar informações do jogo
let grid; // Grid do mapa
let amigosAceitos = []; // Lista de amigos que aceitarão o convite
let startNode; // Posição inicial da Barbie
let startTime, timerInterval; // Controle do timer
let timerStarted = false; // Controle para garantir que o timer só comece uma vez
let totalStepsCompleted = 0; // Contador de passos realizados
let totalStepsGoal = 0; // Total de passos a serem percorridos durante a partida
let custoTotalFinal = 0; // Acumulador para o custo total final da jornada

// Função para formatar o tempo decorrido em minutos e segundos
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

// Função para iniciar o cronômetro
function startTimer() {
  if (!timerStarted) {
    // Iniciar o cronômetro apenas se ele ainda não tiver sido iniciado
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      document.getElementById("timerDisplay").textContent =
        formatTime(elapsedTime);
    }, 1000); // Atualiza o cronômetro a cada segundo
    timerStarted = true; // Marcar que o cronômetro foi iniciado
  }
}

// Função para parar o cronômetro
function stopTimer() {
  clearInterval(timerInterval);
  const finalTime = Date.now() - startTime;
  document.getElementById("timerDisplay").textContent = formatTime(finalTime);
  timerStarted = false; // Resetar o controle do cronômetro para a próxima partida
}

// Referência ao ícone da Barbie
const barbieImg = document.getElementById("barbieImage");

// Sons para eventos do jogo
const encontrarAmigoSound = document.getElementById("encontrarAmigoSound");
const voltarParaCasaSound = document.getElementById("voltarParaCasaSound");

// Definindo os custos dos tipos de terreno no mapa
const terrenoCusto = {
  0: 5, // Grama
  1: 1, // Asfalto
  2: 3, // Terra
  3: 10, // Paralelepípedo
  4: Infinity, // Edifícios (intransponível)
  5: 2, // Outro tipo de terreno, se necessário
};

let gridState = []; // Variável para armazenar o estado original do grid (as cores)

// Localização dos amigos no mapa
const amigos = [
  { x: 12, y: 4, nome: "Amigo 1" },
  { x: 8, y: 9, nome: "Amigo 2" },
  { x: 34, y: 5, nome: "Amigo 3" },
  { x: 37, y: 23, nome: "Amigo 4" },
  { x: 14, y: 35, nome: "Amigo 5" },
  { x: 36, y: 36, nome: "Amigo 6" },
];

// Classe para a implementação de uma fila de prioridades (MinHeap), usada pelo algoritmo A*
class MinHeap {
  constructor() {
    this.heap = [];
  }

  // Inserir um nó na heap
  insert(node) {
    this.heap.push(node);
    this.bubbleUp();
  }

  // Organizar a heap de forma que o menor valor fique no topo
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

  // Remover e retornar o menor elemento da heap
  extractMin() {
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }

  // Reorganizar a heap após a remoção do elemento do topo
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

  // Retornar o tamanho da heap
  size() {
    return this.heap.length;
  }
}

let timerId; // Variável global para controlar o timeout

// Função para sortear 3 amigos que aceitarão o convite
function sortearAmigosAceitos() {
  let shuffledAmigos = [...amigos].sort(() => 0.5 - Math.random());
  return shuffledAmigos.slice(0, 3);
}

// Carregar o grid do arquivo do mapa
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

// Verificar se a posição corresponde à de um amigo
function isAmigoPosition(x, y) {
  return amigos.some((amigo) => amigo.x === x && amigo.y === y);
}

// Função para desenhar o mapa no canvas
function drawMap(grid) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      let color;
      if (isAmigoPosition(x, y)) {
        // Se a posição atual corresponde à de um amigo, usa uma cor especial
        color = "#011640";
      } else {
        // Caso contrário, usa a cor do terreno correspondente
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
            color = "#F26938"; // Edifícios (intransponível)
            break;
          case 5:
            color = "#F22222"; // Outro tipo de terreno
            break;
        }
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

// Classe que representa um nó no mapa, usado pelo algoritmo A*
class Node {
  constructor(x, y, cost, parent = null) {
    this.x = x;
    this.y = y;
    this.cost = cost;
    this.parent = parent;
    this.g = 0; // Custo do início até este nó
    this.h = 0; // Heurística (estimativa de custo até o destino)
    this.f = 0; // Custo total (g + h)
  }
}

// Implementação do algoritmo A* para encontrar o menor caminho
function astar(start, end, grid) {
  let openList = new MinHeap(); // Lista de nós a serem explorados
  let closedSet = new Set(); // Conjunto de nós já explorados

  openList.insert(start);

  while (openList.size() > 0) {
    let currentNode = openList.extractMin(); // Extrair o nó com menor custo total (f)

    // Verificar se o destino foi alcançado
    if (currentNode.x === end.x && currentNode.y === end.y) {
      let path = [];
      let temp = currentNode;
      while (temp) {
        path.push(temp);
        temp = temp.parent;
      }
      return path.reverse(); // Retornar o caminho do início ao fim
    }

    closedSet.add(`${currentNode.x}-${currentNode.y}`); // Marcar o nó como explorado

    // Encontrar os vizinhos (cima, baixo, esquerda, direita)
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
        // Se o vizinho for um edifício ou já tiver sido explorado, ignorar
        if (terrenoCusto[neighbor.cost] === Infinity) {
          console.log(
            `Tentativa de mover para edifício em (${neighbor.x}, ${neighbor.y}) - Movimento bloqueado`
          );
        }
        continue;
      }

      // Calcular o custo acumulado até o vizinho
      let tentativeG = currentNode.g + terrenoCusto[neighbor.cost];
      if (
        tentativeG < neighbor.g ||
        !openList.heap.some((n) => n.x === neighbor.x && n.y === neighbor.y)
      ) {
        neighbor.g = tentativeG;
        neighbor.h =
          Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y); // Heurística (distância Manhattan)
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = currentNode;

        // Inserir o vizinho na lista de exploração
        console.log(
          `Movendo para (${neighbor.x}, ${neighbor.y}) - Custo acumulado: ${neighbor.g}`
        );
        openList.insert(neighbor);
      }
    }
  }

  return []; // Retornar um caminho vazio se não houver solução
}

// Função para animar o caminho percorrido pela Barbie
function animatePath(path, delay = 200, amigo = null, returning = false) {
  let totalCost = 0;
  let index = 0;
  const costList = document.getElementById("costList");
  const totalSteps = path.length; // Total de etapas no caminho

  // Iniciar o cronômetro apenas no primeiro movimento
  if (!timerStarted) {
    startTimer(); // Iniciar o cronômetro quando o primeiro movimento acontecer
  }

  function drawStep() {
    if (index < path.length) {
      let node = path[index];

      totalCost += terrenoCusto[node.cost]; // Atualizar o custo total do caminho

      if (returning) {
        ctx.fillStyle = gridState[node.y][node.x]; // Restaurar a cor original ao voltar para casa
      } else {
        ctx.fillStyle = "lightpink"; // Cor da trilha da Barbie ao visitar amigos
      }

      ctx.fillRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);
      ctx.strokeRect(node.x * tileSize, node.y * tileSize, tileSize, tileSize);

      ctx.drawImage(
        barbieImg,
        node.x * tileSize,
        node.y * tileSize,
        tileSize,
        tileSize
      ); // Desenhar a Barbie na nova posição

      document.getElementById("custoTotal").textContent = totalCost; // Atualizar o custo total na interface

      index++;
      timerId = setTimeout(drawStep, delay); // Continuar a animação após o delay
    } else {
      timerId = null; // Resetar o timerId quando a animação terminar
      if (amigo) {
        const listItem = document.createElement("li");
        listItem.textContent = `${amigo.nome}: Custo ${totalCost}`;
        costList.appendChild(listItem);
        encontrarAmigoSound.play(); // Tocar som ao encontrar um amigo

        // Acumular o custo desse percurso no custo final total
        custoTotalFinal += totalCost;
      } else if (returning) {
        voltarParaCasaSound.play(); // Tocar som ao voltar para casa
        stopTimer();

        // Somar o custo da volta para casa ao custo final total
        custoTotalFinal += totalCost;

        // Atualizar o custo final na interface
        document.getElementById("finalCost").textContent = custoTotalFinal;
      }
    }
  }

  drawStep();
}

// Função para decidir se um amigo será convencido ou não
function tentarConvencerAmigo(amigo) {
  return Math.random() > 0.5; // 50% de chance de convencer
}

// Evento para iniciar o jogo ao clicar no botão "Começar"
document.getElementById("startBtn").addEventListener("click", () => {
  // Verificar se o mapa foi carregado corretamente e os amigos foram sorteados
  if (grid && startNode && amigosAceitos.length > 0) {
    startTimer(); // Iniciar o cronômetro
    visitarAmigos(startNode, amigosAceitos); // Iniciar a movimentação da Barbie

    // Reiniciar a barra de progresso ao iniciar o jogo
    atualizarBarraDeProgresso(0);
  } else {
    alert(
      "O mapa ainda não está pronto ou os amigos ainda não foram sorteados."
    );
    console.error("O jogo ainda não está pronto para começar.");
  }
});

// Evento para reiniciar o jogo ao clicar no botão "Reiniciar"
document.getElementById("resetBtn").addEventListener("click", () => {
  location.reload(); // Recarregar a página para reiniciar o jogo
});

// Função para inicializar o jogo ao carregar a página
function inicializarJogo() {
  loadGridFromFile("js/map.txt")
    .then((loadedGrid) => {
      console.log("Mapa carregado com sucesso");
      grid = loadedGrid; // Armazenar o grid carregado
      drawMap(grid); // Desenhar o mapa no canvas

      startNode = new Node(18, 22, grid[22][18]); // Definir a casa da Barbie como ponto inicial

      // Sortear os 3 amigos que aceitarão
      amigosAceitos = sortearAmigosAceitos();
      console.log(
        "Amigos Aceitos: ",
        amigosAceitos.map((a) => a.nome).join(", ")
      );

      // Exibir os amigos sorteados na interface
      document.getElementById("amigosSorteados").textContent = amigosAceitos
        .map((a) => a.nome)
        .join(", ");

      // O jogo está pronto, mas a movimentação só começa quando o botão for clicado
      visitarAmigos(startNode, amigosAceitos);
    })
    .catch((error) => {
      console.error("Erro ao carregar o mapa:", error);
    });
}

// Inicializar o jogo ao carregar a página
inicializarJogo();

// Carregar o grid do arquivo do mapa e iniciar a movimentação da Barbie
loadGridFromFile("js/map.txt")
  .then((grid) => {
    console.log("Mapa carregado com sucesso");
    drawMap(grid); // Desenhar o mapa no canvas

    let startNode = new Node(18, 22, grid[22][18]); // Casa da Barbie (ponto inicial)

    // Sortear os 3 amigos que aceitarão
    let amigosAceitos = sortearAmigosAceitos();
    console.log("Amigos Aceitos:", amigosAceitos.map((a) => a.nome).join(", "));

    // Exibir os amigos sorteados na interface
    document.getElementById("amigosSorteados").textContent = amigosAceitos
      .map((a) => a.nome)
      .join(", ");

    let amigosEncontrados = [];

    // Função para visitar amigos
    function visitarAmigos(
      startNode,
      amigosNaoVisitados,
      amigosConvencidos = 0
    ) {
      if (amigosConvencidos >= 3) {
        // Se já convenceu 3 amigos, voltar para casa
        let returnHome = new Node(18, 22, grid[22][18]);
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
          stopTimer();
          console.log("Retornou para casa");
        }, path.length * 200);
      } else if (amigosNaoVisitados.length > 0) {
        // Calcular o próximo amigo mais próximo usando A* (menor custo)
        let proximoAmigo = null;
        let menorCusto = Infinity;
        let proximoCaminho = [];

        amigosNaoVisitados.forEach((amigo) => {
          let endNode = new Node(amigo.x, amigo.y, grid[amigo.y][amigo.x]);
          let path = astar(startNode, endNode, grid); // Encontra o caminho com A*

          // Verifica se o custo desse caminho é o menor até agora
          if (path.length > 0) {
            let custoCaminho = path.reduce(
              (soma, node) => soma + terrenoCusto[node.cost],
              0
            );
            if (custoCaminho < menorCusto) {
              menorCusto = custoCaminho;
              proximoAmigo = amigo;
              proximoCaminho = path;
            }
          }
        });

        if (!proximoAmigo) {
          console.error("Nenhum caminho encontrado para os amigos restantes");
          return;
        }

        // Visita o amigo mais próximo encontrado
        animatePath(proximoCaminho, 100, proximoAmigo);

        setTimeout(() => {
          if (amigosAceitos.includes(proximoAmigo)) {
            amigosEncontrados.push(proximoAmigo.nome);
            amigosConvencidos++;
            document.getElementById("amigosEncontrados").textContent =
              amigosEncontrados.join(", ");
            console.log(`Convencido: ${proximoAmigo.nome}`);
          } else {
            console.log(`Recusado: ${proximoAmigo.nome}`);
          }

          // Remove o amigo da lista de amigos não visitados
          amigosNaoVisitados = amigosNaoVisitados.filter(
            (amigo) => amigo !== proximoAmigo
          );
          startNode = new Node(
            proximoAmigo.x,
            proximoAmigo.y,
            grid[proximoAmigo.y][proximoAmigo.x]
          );

          // Continua visitando os próximos amigos
          visitarAmigos(startNode, amigosNaoVisitados, amigosConvencidos);
        }, proximoCaminho.length * 100); // Ajustado para garantir que a Barbie chegue ao amigo antes de continuar
      } else {
        // Caso tenha percorrido todos os amigos sem convencer 3, ainda assim retorna para casa
        let returnHome = new Node(18, 22, grid[22][18]);
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
          console.log("Retornou para casa após visitar todos os amigos");
        }, path.length * 200);
      }
    }

    // Inicializa a visitação dos amigos ao carregar o mapa
    visitarAmigos(new Node(18, 22, grid[22][18]), amigos);
  })
  .catch((error) => {
    console.error("Erro ao carregar o mapa:", error);
  });

// Função para calcular a ordem otimizada usando vizinho mais próximo
function calcularOrdemHeuristica(amigos, startNode) {
  let ordem = [];
  let naoVisitados = [...amigos];
  let atual = startNode;

  while (naoVisitados.length > 0) {
    let menorDistancia = Infinity;
    let proximoAmigo = null;
    let proximoIndex = -1;

    // Encontrar o amigo mais próximo usando distância de Manhattan
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
      naoVisitados.splice(proximoIndex, 1); // Remove o amigo da lista de não visitados
      atual = new Node(proximoAmigo.x, proximoAmigo.y, 0); // Atualiza a posição atual
    }
  }

  return ordem; // Retorna a ordem dos amigos na sequência otimizada de visitação
}
