function carregarPDF() {
    const input = document.querySelector('input[type="file"]');
    const file = input.files[0];

    if (!file) {
        alert('Nenhum arquivo selecionado.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const arrayBuffer = e.target.result;

        // Usa pdfjsLib para obter o documento PDF a partir do ArrayBuffer
        pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function (pdf) {
            let textoPDF = '';

            // Função auxiliar para obter o texto de todas as páginas
            const getPagesText = function (startPage, endPage) {
                let promises = [];
                for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
                    promises.push(pdf.getPage(pageNumber).then(function (page) {
                        return page.getTextContent();
                    }));
                }
                return Promise.all(promises);
            };

            // Obtém texto de todas as páginas do PDF
            getPagesText(1, pdf.numPages).then(function (pagesText) {
                pagesText.forEach(function (textContent) {
                    textoPDF += textContent.items.map(item => item.str).join(' ');
                });

                const textoPDFElement = document.getElementById('textoPDF');
                if (textoPDFElement) {
                    textoPDFElement.value = textoPDF;
                    verificarCorrecoes();
                }
            }).catch(function (error) {
                console.error('Erro ao extrair texto do PDF:', error);
                alert('Erro ao extrair texto do PDF. Verifique se é um arquivo PDF válido.');
            });
        });
    };

    // Lê o arquivo como ArrayBuffer
    reader.readAsArrayBuffer(file);
}

// Função para aplicar correção
function aplicarCorrecao(correcao) {
    const textoPDFElement = document.getElementById('textoPDF');
    let textoPDF = textoPDFElement.value;

    textoPDF = textoPDF.substring(0, correcao.offset) + correcao.sugestao + textoPDF.substring(correcao.offset + correcao.length);

    textoPDFElement.value = textoPDF;
}

function verificarCorrecoes() {
    const textoPDFElement = document.getElementById('textoPDF');
    const textoPDF = textoPDFElement.value;

    if (!textoPDF) {
        console.error('Texto do PDF vazio ou não encontrado.');
        alert('Por favor, carregue um PDF antes de verificar as correções.');
        return;
    }

    // Utilizando a API LanguageTool para obter sugestões
    fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: new URLSearchParams({
            text: textoPDF,
            language: 'pt-BR'
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erro de resposta da API: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        const sugestoes = data.matches;

        sugestoes.sort((a, b) => b.context.offset - a.context.offset);
        exibirSugestoes(sugestoes);
    })
    .catch(error => {
        console.error('Erro ao acessar a API da LanguageTool:', error.message);
        alert(`Erro ao verificar as correções. Por favor, tente novamente mais tarde. Detalhes: ${error.message}`);
    });
}

// Função para exibir sugestões na interface
// Função para exibir sugestões na interface
function exibirSugestoes(sugestoes) {
    const sugestoesDiv = document.getElementById('sugestoes');
    sugestoesDiv.innerHTML = '<p class="titulo-sugestoes">Sugestões de Correção:</p>';

    if (sugestoes.length === 0) {
        sugestoesDiv.innerHTML += '<p>Nenhum erro encontrado.</p>';
    } else {
        const sugestoesAtuais = sugestoes.slice(0, 5); // Mostra as primeiras 5 sugestões
        exibirSugestoesInternas(sugestoesAtuais);
    }
}

// Função interna para exibir sugestões na interface
function exibirSugestoesInternas(sugestoes) {
    const sugestoesDiv = document.getElementById('sugestoes');

    sugestoes.forEach((sugestao, index) => {
        if (sugestao.context && sugestao.context.text) {
            const palavraErradaTexto = sugestao.context.text.substring(sugestao.context.offset, sugestao.context.offset + sugestao.context.length).trim();

            if (palavraErradaTexto !== '') {
                const sugestaoDiv = document.createElement('div');
                sugestaoDiv.className = 'sugestao';

                const palavraErrada = document.createElement('p');
                palavraErrada.textContent = `Palavra Errada: ${palavraErradaTexto}`;

                const sugestaoText = document.createElement('p');
                sugestaoText.textContent = 'Sugestões:';

                const sugestoesList = document.createElement('ul');
                sugestao.replacements.slice(0, 10).forEach((replacement, sugestaoIndex) => { // Limita a 10 sugestões
                    const sugestaoItem = document.createElement('li');
                    sugestaoItem.textContent = `${sugestaoIndex + 1}- ${replacement.value} `;
                    sugestoesList.appendChild(sugestaoItem);
                });

                sugestaoText.appendChild(sugestoesList);

                const btnCorrecaoSugestao = document.createElement('button');
                btnCorrecaoSugestao.textContent = 'Corrigir Sugestão';
                btnCorrecaoSugestao.addEventListener('click', function () {
                    const numeroSugestao = prompt(`Digite o número da sugestão para corrigir ${palavraErradaTexto}:`);
                    if (numeroSugestao !== null) {
                        const indexSugestao = parseInt(numeroSugestao) - 1;
                        if (indexSugestao >= 0 && indexSugestao < sugestao.replacements.length) {
                            aplicarCorrecao(sugestao.context.offset, sugestao.context.length, sugestao.replacements[indexSugestao].value);
                        } else {
                            alert('Número de sugestão inválido.');
                        }
                    }
                });

                sugestaoDiv.appendChild(palavraErrada);
                sugestaoDiv.appendChild(sugestaoText);
                sugestaoDiv.appendChild(btnCorrecaoSugestao);

                sugestoesDiv.appendChild(sugestaoDiv);
            }
        }
    });
}


function aplicarCorrecao(offset, length, sugestao) {
    const textoPDFElement = document.getElementById('textoPDF');
    let textoPDF = textoPDFElement.value;

    textoPDF = textoPDF.substring(0, offset) + sugestao + textoPDF.substring(offset + length);

    textoPDFElement.value = textoPDF;
    verificarCorrecoes(); // Adicionado para refletir correções no texto
}




// Função para escapar caracteres especiais em expressões regulares
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// Função para verificar se todos os erros foram corrigidos antes de retirar o arquivo
function verificarErrosRestantes() {
    const textoPDFElement = document.getElementById('textoPDF');
    const textoPDF = textoPDFElement.value;

    try {
        const numeroErrosRestantes = contarErros(textoPDF);

        if (numeroErrosRestantes === 0) {
            alert('Todos os erros foram corrigidos. O arquivo pode ser retirado agora.');
            // Implemente lógica para retirar o arquivo corrigido (por exemplo, enviar para o servidor).
        } else {
            // Verifica se há espaços extras no final do texto corrigido
            const textoSemEspacosExtras = textoPDF.trim();
            const numeroErrosRestantesSemEspacos = contarErros(textoSemEspacosExtras);

            if (numeroErrosRestantesSemEspacos === 0) {
                const confirmacao = confirm(`Ainda existem ${numeroErrosRestantes} erro(s) no texto. Deseja continuar retirando o arquivo?`);
                if (confirmacao) {
                    // Implemente lógica para retirar o arquivo mesmo com erros restantes.
                }
            } else {
                alert(`Ainda existem ${numeroErrosRestantes} erro(s) no texto. Corrija antes de retirar o arquivo.`);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar erros restantes:', error.message);
        alert('Erro ao verificar erros restantes. Por favor, tente novamente.');
    }
}

// Função para contar o número de erros no texto
function contarErros(texto) {
    // Substitua este exemplo com sua própria implementação.
    const palavrasErradas = ["erro1", "erro2", "erro3"]; // Substitua com suas palavras erradas
    const erros = palavrasErradas.filter(palavra => texto.includes(palavra));
    return erros.length;
}

// Função para baixar arquivo corrigido
function baixarArquivoCorrigido() {
    const textoPDFElement = document.getElementById('textoPDF');
    const textoCorrigido = textoPDFElement.value;

    // Criar um Blob com o texto corrigido
    const blob = new Blob([textoCorrigido], { type: 'application/pdf' });

    // Criar um link de download
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'arquivo_corrigido.pdf';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}