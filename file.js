const windowSize = window.innerWidth; // Get the screen width from client
const imgImpar = windowSize < 769 ? `<img id="imgx" src="img/x.webp" alt="X" width="90" height="90" />` : `<img id="imgx" src="img/x.webp" alt="X" width="100" height="100" />`;
const imgPar = windowSize < 769 ? `<img id="img0" src="img/0.webp" alt="0" width="90" height="90" />` : `<img id="img0" src="img/0.webp" alt="0" width="100" height="100" />`;

let matchOpen = false;
let player = null;

let board = Array(9).fill(null);

const vitoria = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
]

const menu = document.querySelector('.menu');

menu.addEventListener('click', () => {
    const about = document.querySelector('.about');
    menu.classList.toggle('active');
    about.classList.toggle('active');
});

function verificarVitoria(board, jogador) {
    // Retorna a combinação vencedora do jogador, por exemplo [0, 4, 8].
    // Se nenhuma combinação estiver totalmente ocupada por ele, retorna undefined.
    return vitoria.find(
        (combinacao) => combinacao
        .every(
            (posicao) => board[posicao] === jogador
        )
    );
}

const socket = io('http://192.168.0.40:3006');
function createMultplayerGame() {
    const createMatch = document.querySelector('.create-game');
    if (createMatch) createMatch.addEventListener('click', () => socket.emit('create-game'));
}

const params = new URLSearchParams(window.location.search);
let gameCode = params.get('game');

socket.on('game-created', (resGameCode) => {
    const invite = document.getElementById('invite');
    const url = new URL(window.location.href);
    url.searchParams.set('game', resGameCode);
    invite.innerHTML = `
        <p>Link da partida: <span>${url}</span></p>
        <div class="share">
            <button onclick="copiarConvite('${url}')">
                <img src="img/copy.webp" width="30" height="30" />
            </button>
        </div>
    `;
    const shareblock = document.querySelector('.share');
    if (navigator.share) {
        shareblock.innerHTML += `
            <button onclick="compartilharConvite('${url}')">
                <img src="img/share.webp" width="30" height="30" />
            </button>
        `;
    }

    document.querySelector('.create-game').remove();
    const msg = document.getElementById('msg');
    msg.innerHTML = 'Você jogará como <img src="img/x.webp" style="width: 30px">';
    setTimeout(() => {
        msg.innerHTML = '';
    }, 4000);

    const shareButtons = document.querySelectorAll('.share button');
    shareButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.style.transform = 'scale(0.9)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 200);
        });
    });
    gameCode = resGameCode;
    matchOpen = true;
    player = 'X';
})

async function copiarConvite(url) {
    const notify = document.querySelector('.notify');
    notify.style.display = 'flex';

    if (!window.isSecureContext || !navigator.clipboard) {
        notify.textContent = 'Cópia automática indisponível nesta conexão.';
        setTimeout(() => {
            notify.textContent = 'Você pode copiar o link manualmente';
            setTimeout(() => {
                notify.style.display = 'none';
                notify.textContent = '';
            }, 3000);
        }, 3000);
        return;
    }

    notify.textContent = 'Copiando link...';

    await navigator.clipboard.writeText(url);
    notify.textContent = 'Link copiado para a área de transferência!';
    setTimeout(() => {
        notify.style.display = 'none';
        notify.textContent = '';
    }, 2000);
}

async function compartilharConvite(url) {
    const notify = document.querySelector('.notify');
    if (navigator.share) {
        await navigator.share({
            title: 'Jogo da Velha',
            text: 'Vamos jogar uma partida?',
            url: url
        });
        notify.style.display = 'flex';
        notify.textContent = 'Link compartilhado com sucesso!';
        setTimeout(() => {
            notify.style.display = 'none';
            notify.textContent = '';
        }, 2000);
    }
}

if (gameCode) {
    console.log('Entrando na partida:', gameCode);
    socket.emit('join-game', gameCode);
    document.querySelector('.create-game').remove();
    const msg = document.getElementById('msg');
    msg.innerHTML = 'Você jogará como <img src="img/0.webp" style="width: 30px">';
    setTimeout(() => {
        msg.innerHTML = '';
    }, 4000);
    matchOpen = true;
    player = 'O';
}

socket.on('player-joined', (data) => {
    console.log('Jogador entrou na partida:', data);
    const msg = document.getElementById('msg');
    msg.textContent = data;
    setTimeout(() => {
        msg.textContent = '';
    }, 1500);
});

socket.on('game-ready',(data) => {
    console.log('Partida pronta:', data);
    setTimeout(() => {
        const invite = document.getElementById('invite');
        invite.innerHTML = ``;
    }, 10000);
});

socket.on('error', (error) => {
    const msg = document.getElementById('msg');
    if (error.type === 'not-found') {
        msg.textContent = error.message;
    }
    if (error.type === 'full') {
        msg.textContent = error.message;
    }
    board = Array(9).fill(null);
    matchOpen = false;
    player = null;
    gameCode = null;
    history.replaceState(null, '', window.location.pathname);

    setTimeout(() => {
        msg.textContent = '';
        document.getElementsByTagName('main')[0].innerHTML = reloadGame();
        createMultplayerGame();
    }, 3000);
    console.log('Erro ao entrar na partida:', error);
});

socket.on('opponent-disconnected', (data) => {
    const msg = document.getElementById('msg');
    msg.textContent = data.message;
    setTimeout(() => {
        msg.textContent = '';
    }, 3000);
    board = Array(9).fill(null);
    matchOpen = false;
    player = null;
    gameCode = null;
    history.replaceState(null, '', window.location.pathname);

    setTimeout(() => {
        document.getElementsByTagName('main')[0].innerHTML = reloadGame();
        createMultplayerGame();
    }, 3000);
});

socket.on('play-error', (error) => {
    const messageElement = document.getElementById('msg');
    if (error.type === 'missing-player') {
        messageElement.textContent = error.message;
    }
    else if (error.type === 'not-found') {
        messageElement.textContent = error.message;
    }
    else if (error.type === 'not-player') {
        messageElement.textContent = error.message;
    }
    else if (error.type === 'turn') {
        messageElement.textContent = `Aguarde o jogador ${error.turn} fazer sua jogada.`;
    } else  if (error.type === 'occupied') {
        messageElement.textContent = `A posição ${error.position} já está ocupada.`;
    } else if (error.type === 'finished') {
        const againButton = document.querySelector('#msg button');
        console.log('Again Button ===> ', againButton);
        againButton.style.visibility = 'hidden';
        let span = document.createElement('span');
        span.textContent = error.message;
        messageElement.appendChild(span);
        setTimeout(() => {
            console.log('Removendo span de mensagem de erro...');
            console.log('Retornando botão de jogar novamente...');
            againButton.style.visibility = 'visible';
            messageElement.removeChild(span);
        }, 3000);
        return;
    }
    setTimeout(() => {
        messageElement.textContent = '';
    }, 3000);
});

socket.on('game-state', (state) => {
    board = state.board;

    board.forEach((valor, posicao) => {
        const campo = document.getElementById(`d${posicao + 1}`);

        if (valor === 'X') {
            campo.innerHTML = imgImpar;
            campo.removeAttribute('onclick');
        } else if (valor === 'O') {
            campo.innerHTML = imgPar;
            campo.removeAttribute('onclick');
        }
    });
});

socket.on('game-over', (data) => {
    let vencedor = data.winner;
    const seqVitoria = data.winningSequence;
    board = data.board;

    if (seqVitoria) {
        for (let posicao of seqVitoria) {
            document.getElementById(`d${posicao + 1}`).style.backgroundColor = '#303030';
        }
        vencedor = vencedor === 'X'
            ? '<img src="img/x.webp" style="width: 30px">'
            : '<img src="img/0.webp" style="width: 30px">';
        const msg = document.getElementById('msg');
        msg.innerHTML = 
            `<p style="font-size: 30px;">Jogador ${vencedor} ganhou!!!</p><br />
            <button style="background: #c0c0c0; width: 90px; padding: 5px" onclick="jogarNovamente()">Jogar Novamente?</button>`;
        for (let posicao = 1; posicao < 10; posicao++) {
            document.getElementById(`d${posicao}`).removeAttribute('onclick');
        }
    } else {
        const msg = document.getElementById('msg');
        msg.innerHTML = `
        <p style="font-size: 30px;">Empate!</p><br />
        <button style="background: #c0c0c0; width: 90px; padding: 5px" onclick="jogarNovamente()">Jogar Novamente?</button>`;
    }
});

function jogarNovamente() {
    socket.emit('play-again', gameCode);
}
socket.on('accept-restart', () => {
    const msg = document.getElementById('msg');
    msg.innerHTML = `
        <p style="font-size: 30px;">Gostaria de jogar novamente?</p><br />
        <div style="display: flex; justify-content: center; gap: 10px">
            <button style="background: #c0c0c0; width: 80px; padding: 5px" onclick="aceitar()">&#x2705;</button>
            <button style="background: #c0c0c0; width: 80px; padding: 5px" onclick="recusar()">&#x274C;</button>
        </div>
    `;
})

function aceitar() {
    socket.emit('accepted', gameCode);
    console.log('Partida aceita');
};

socket.on('reload-game', () => {
    carregar();
    console.log('Partida reiniciada');
});

function recusar() {
    console.log('Partida encerrada pelo jogador', socket.id);
    socket.emit('declined', gameCode);

    history.replaceState(null, '', window.location.pathname);

    matchOpen = false;
    player = null;
    gameCode = null;
    document.getElementsByTagName('main')[0].innerHTML = reloadGame();

    board = Array(9).fill(null);

    createMultplayerGame();
}

socket.on('restart-game-declined', () => {
    setTimeout(() => {
        console.log('Aguardando resposta do outro jogador...');
    }, 3000);
    const msg = document.getElementById('msg');
    msg.innerHTML = `
        <p style="font-size: 30px;">A partida foi finalizada!</p><br />
    `;
    setTimeout(() => {
        msg.innerHTML = '';
        history.replaceState(null, '', window.location.pathname);
    
        matchOpen = false;
        player = null;
        gameCode = null;
    
        board = Array(9).fill(null);
        document.getElementsByTagName('main')[0].innerHTML = reloadGame();
    
        createMultplayerGame();
    }, 3000);

});

function verificarJogada(jogadorDaVez) {
    let conta = board.length - board.filter(posicao => posicao === null).length;
    const seqVitoria = verificarVitoria(board, jogadorDaVez);

    if (seqVitoria) {
        for (let posicao of seqVitoria) {
            document.getElementById(`d${posicao + 1}`).style.backgroundColor = '#303030';
        }
        let vencedor = jogadorDaVez === 'X'
            ? '<img src="img/x.webp" style="width: 30px">'
            : '<img src="img/0.webp" style="width: 30px">';
        const msg = document.getElementById('msg');
        msg.innerHTML = 
            `<p style="font-size: 30px;">Jogador ${vencedor} ganhou!!!</p><br />
            <button style="background: #c0c0c0;padding: 5px" onclick="carregar()">Jogar Novamente?</button>`;
        for (let posicao = 1; posicao < 10; posicao++) {
            document.getElementById(`d${posicao}`).removeAttribute('onclick');
        }
    } else if (conta >= 9) {
        const msg = document.getElementById('msg');
        msg.innerHTML = 
            `<button style="background: #c0c0c0; width: 80px; padding: 5px" onclick="carregar()">Jogar Novamente?</button>`;
    }
}

function jogadorDaVez() {
    const jogadas = board.filter(posicao => posicao !== null).length;
    // Conta quantas jogadas já foram realizadas antes da próxima jogada.
    // Como X sempre começa:
    // quantidade par de jogadas realizadas -> vez de X
    // quantidade ímpar de jogadas realizadas -> vez de O
    return jogadas % 2 === 0 ? 'X' : 'O';
}

function jogada(casaId) {
    const n = casaId.split("")[1] - 1;

    if (matchOpen) {
        console.log('GameCode', gameCode);
        socket.emit('play', {
            gameCode,
            position: n
        });
        return;
    }

    if (board[n] !== null) return;

    const jogador = jogadorDaVez();

    board[n] = jogador;

    const campo = document.getElementById(casaId);
    campo.innerHTML = board[n] === 'X' ? imgImpar : imgPar;
    campo.removeAttribute('onclick');

    verificarJogada(jogador);
}

const reloadGame = () => {
    let ini = `
            <!--  JOGO DA VELHA -->
            <div class="game">
                <div id="d1" onclick="jogada('d1')" style="background-color: 'darkkhaki'"></div>
                <div id="d2" onclick="jogada('d2')" style="background-color: 'darkkhaki'"></div>
                <div id="d3" onclick="jogada('d3')" style="background-color: 'darkkhaki'"></div>
                <div id="d4" onclick="jogada('d4')" style="background-color: 'darkkhaki'"></div>
                <div id="d5" onclick="jogada('d5')" style="background-color: 'darkkhaki'"></div>
                <div id="d6" onclick="jogada('d6')" style="background-color: 'darkkhaki'"></div>
                <div id="d7" onclick="jogada('d7')" style="background-color: 'darkkhaki'"></div>
                <div id="d8" onclick="jogada('d8')" style="background-color: 'darkkhaki'"></div>
                <div id="d9" onclick="jogada('d9')" style="background-color: 'darkkhaki'"></div>
            </div>
            <div id="msg"></div>
    `;
    if (!matchOpen) {
        ini += `
            <button class="create-game">Criar Partida</button>
            <div id="invite"></div>
        `;
    }
    return ini;
};

function carregar() {
    document.getElementsByTagName('main')[0].innerHTML = reloadGame();
    board = Array(9).fill(null);

    for (let posicao = 1; posicao < 10; posicao++) {
        document.getElementById(`d${posicao}`).removeAttribute('style');
    }

    if (matchOpen) {
        const msg = document.getElementById('msg');
        const jogador = player === 'X' ? '<img src="img/x.webp" style="width: 30px">' : '<img src="img/0.webp" style="width: 30px">';
        msg.innerHTML = `Você jogará como ${jogador}`;
        setTimeout(() => {
            msg.innerHTML = '';
        }, 4000);
    } else {
        createMultplayerGame();
    }
}

createMultplayerGame();
