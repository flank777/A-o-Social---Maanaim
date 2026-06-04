/* ══════════════════════════════════════════════════════════════════════
   dona-assuncao.js — Agente Dona Assunção (Chatbot Humanizado)
   DoaVida · Ação Social Semear + Comunidade Evangélica Maanaim

   Dona Assunção é uma avozinha simpática, acolhedora e cheia de fé.
   Ela conversa com os visitantes sobre:
   ✅ Doações de alimentos
   ✅ Voluntariado
   ✅ A missão da Ação Social
   ✅ Como funciona o sistema
   ✅ Versículos bíblicos (de forma natural)

   Ela NUNCA fala sobre:
   ❌ Código, programação, tecnologia
   ❌ Painel admin, banco de dados
   ❌ Dados pessoais de doadores
   ❌ Assuntos fora do contexto da ação social
   ══════════════════════════════════════════════════════════════════════ */

/* ─── 1. BANCO DE RESPOSTAS ───────────────────────────────────────── */
/* Objeto com todas as respostas organizadas por tema */
var DonaRespostas = {
  /* Saudações e boas-vindas */
  saudacao: [
    "Olá, meu filho! 🤗 Que bom te ver por aqui! Sou a Dona Assunção, e estou aqui pra te ajudar no que precisar. Como posso te servir hoje?",
    'Oi, querido! 😊 Bem-vindo à nossa ação social! "O Senhor é bom para todos" (Salmo 145:9). Em que posso te ajudar?',
    "Que alegria te receber aqui! 🌻 Sou a vovó Assunção. Me conta, o que te trouxe até nós?",
    "Olá, benzinho! Que Deus abençoe seu dia! ✨ Estou aqui pronta pra conversar. O que você gostaria de saber?",
  ],

  /* Sobre doações */
  doacao: [
    'Que coração generoso, meu filho! 💛 Para fazer uma doação, é bem simples: clique em "Doar Agora" no menu ou vá direto pra página de doação. Lá você escolhe os alimentos e a quantidade. Cada doação faz uma diferença enorme! "Deus ama quem dá com alegria" (2 Coríntios 9:7).',
    'Fico tão feliz que queira ajudar! 🤗 Na página de doação você pode escolher entre vários alimentos — arroz, feijão, leite, óleo... Tudo que faz falta nas famílias que atendemos aqui em Belém. É só clicar em "Doar Agora" ali no menu!',
    'Que lindo, querido! 🌾 Cada grão de arroz, cada litro de leite... tudo importa! Vai na página de doação e escolhe o que seu coração mandar. "Quem semeia com generosidade, com generosidade colherá" (2 Coríntios 9:6).',
  ],

  /* Sobre voluntariado */
  voluntario: [
    'Ah, que maravilha! 🙌 Ser voluntário é uma bênção! Temos várias formas de ajudar: separando alimentos, fazendo entregas, ajudando na cozinha ou no acolhimento. Clique em "Seja Voluntário" no menu e preencha o formulário. É rapidinho!',
    'Meu coração se enche de alegria quando alguém quer servir! 💛 Vai lá na página "Seja Voluntário" e se cadastra. Você pode escolher como prefere ajudar. "Sirvo ao Senhor com alegria" é o nosso lema! (Salmo 100:2)',
    'Que bom que quer fazer parte da nossa família! 🤗 No menu tem o botão "Seja Voluntário". Lá você escolhe o tipo de ajuda: entrega, separação, cozinha ou acolhimento. Cada mãozinha faz uma diferença enorme!',
  ],

  /* Sobre a missão */
  missao: [
    'A Ação Social Semear, junto com a Comunidade Evangélica Maanaim, trabalha aqui em Belém, no Pará, levando alimentos e esperança pra quem mais precisa. 🌿 "Porque tive fome e me destes de comer" (Mateus 25:35). Cada doação é uma semente que a gente planta com amor!',
    "Nossa missão é linda, meu filho! 💛 Somos a Ação Social Semear em parceria com a Comunidade Maanaim. Cuidamos de famílias em situação de vulnerabilidade aqui em Belém. Doações de alimentos, voluntariado, acolhimento... tudo feito com muito amor e fé!",
    'Sabe, querido, a gente acredita que "o amor ao próximo é a maior herança que podemos deixar". 🌻 A Semear e a Maanaim se uniram pra fazer a diferença em Belém. Cada cesta que entregamos é um abraço de Deus chegando nessas famílias.',
  ],

  /* Como funciona */
  comoFunciona: [
    "É bem simples, meu anjo! 📋 Funciona assim: 1️⃣ O doador escolhe os alimentos na página de doação. 2️⃣ A gente registra e organiza tudo. 3️⃣ Os voluntários separam e preparam as cestas. 4️⃣ Entregamos com carinho pras famílias! Tudo organizado direitinho.",
    'Funciona assim, querido: a pessoa entra no site, escolhe o que quer doar (arroz, feijão, leite...), e registra a doação. 📝 Depois a nossa equipe de voluntários cuida de tudo — separa, organiza e entrega! "Cada um contribua segundo propôs no seu coração" (2 Coríntios 9:7).',
    "Ah, deixa eu te explicar! 🤗 É bem fácil: o doador acessa o formulário, escolhe os alimentos e a quantidade. A gente registra tudo e nossos voluntários maravilhosos cuidam da separação e entrega. Tudo com muito amor e organização!",
  ],

  /* Galeria */
  galeria: [
    'Ai, que bom que quer ver! 📸 Na nossa galeria tem fotos lindas das ações! Momentos de entrega, preparo das cestas, o sorriso das famílias... Clique em "Galeria" no menu pra ver tudo. Cada foto conta uma história de amor!',
    'A galeria é o meu xodó! 🌟 Lá tem registros de tudo que fazemos — fotos das entregas, dos voluntários trabalhando, das famílias recebendo. Vai lá ver, querido! É só clicar em "Galeria" no menu.',
  ],

  /* Versículos e motivação */
  fe: [
    '"Não nos cansemos de fazer o bem, pois no tempo certo colheremos, se não desanimarmos." (Gálatas 6:9) 🙏 Cada gesto de amor conta, meu filho!',
    '"O que semeia generosamente, generosamente também colherá." (2 Coríntios 9:6) 🌾 Continue fazendo o bem, querido. Deus vê cada esforço!',
    '"Porque tive fome, e vocês me deram de comer; tive sede, e vocês me deram de beber." (Mateus 25:35) 💛 É isso que fazemos aqui, com a graça de Deus!',
    '"O amor é paciente, o amor é bondoso." (1 Coríntios 13:4) 🤗 E é com esse amor que a gente trabalha, meu filho. Cada dia é uma oportunidade de amar mais!',
  ],

  /* Agradecimento */
  agradecimento: [
    'Imagina, querido! 🤗 É uma alegria poder ajudar. Que Deus abençoe muito você e toda a sua família! "A graça do Senhor Jesus Cristo seja com todos vocês." (Filipenses 4:23)',
    "De nada, meu filho! 💛 Deus abençoe seu coração generoso! Se precisar de qualquer coisa, a vovó Assunção está aqui!",
    'Eu que agradeço por você ter vindo aqui! 🌻 "Deem graças ao Senhor, porque ele é bom; o seu amor dura para sempre." (Salmo 136:1). Volte sempre!',
  ],

  /* Despedida */
  despedida: [
    'Que Deus te abençoe e te guarde, meu filho! 🙏✨ Volte sempre que quiser conversar. A porta está sempre aberta! "O Senhor te abençoe e te guarde" (Números 6:24).',
    "Até mais, querido! 💛 Foi uma alegria conversar com você. Que Deus ilumine seu caminho! Volte quando quiser!",
    "Vá com Deus, meu anjo! 🌻 E lembre-se: cada ato de bondade transforma o mundo um pouquinho. Até a próxima!",
  ],

  /* Quando não entende */
  naoEntendi: [
    "Ai, meu filho, essa velha aqui não entendeu muito bem... 😅 Pode me perguntar sobre doações, voluntariado, nossa missão ou como funciona? Nisso eu sou boa!",
    "Hmm, acho que não entendi direito, querido. 🤔 Sou boa mesmo é em falar sobre doações, voluntariado e nossa ação social. Quer saber sobre alguma dessas coisas?",
    "Essa vovó aqui é meio dura de entender às vezes! 😄 Me pergunta sobre doação, voluntariado, a galeria ou como funciona que eu te explico direitinho!",
  ],

  /* Quando pergunta sobre código/admin/dados (recusa educada) */
  recusa: [
    "Ai, meu filho, isso aí é coisa lá dos rapazes da tecnologia! 😄 Eu entendo mesmo é de comida, de cuidar das famílias e de muito amor! Quer saber como fazer uma doação ou ser voluntário?",
    "Eita, isso tá fora da minha cozinha! 😅 Sou apenas uma vovó que cuida das pessoas. Me pergunta sobre doação, voluntariado ou nossa missão que eu te ajudo!",
    "Ah, querido, isso eu não sei não! 🤗 Meu negócio é cuidar de gente! Posso te ajudar com doações, voluntariado ou contar sobre nosso trabalho aqui em Belém.",
  ],
};

/* ─── 1B. RESPOSTAS EXTRAS (horário, localização, contato, fé, família) ── */
DonaRespostas.horario = [
  "Atendemos de segunda a sexta, das 8h às 17h, e aos sábados das 8h às 12h. 🕗 Às vezes ficamos além do horário quando o coração manda! Tem alguma dúvida sobre como nos visitar?",
  "Nosso horário de atendimento é de segunda a sexta das 8h às 17h. 📅 Mas as doações podem ser registradas aqui no site a qualquer hora! Se quiser nos visitar pessoalmente, entre em contato antes pelo WhatsApp.",
];
DonaRespostas.localizacao = [
  "Estamos em Belém do Pará! 📍 A Comunidade Evangélica Maanaim nos abriga com muito carinho. Para saber o endereço exato e como chegar, entre em contato pelo WhatsApp que a gente te passa tudo direitinho. 🙏",
  "Ficamos em Belém, PA! 🌿 Nossa sede é na Comunidade Maanaim. Quer saber como chegar? Manda uma mensagem no WhatsApp que a gente te orienta com prazer!",
];
DonaRespostas.contato = [
  "Para entrar em contato com a gente, o melhor jeito é pelo WhatsApp! 📱 Você também pode nos encontrar pelas redes sociais. Quer saber mais alguma coisa?",
  "A gente adora conversar! 😊 O contato mais rápido é pelo WhatsApp. Mas é claro que você também pode vir nos visitar pessoalmente aqui em Belém. Como posso te ajudar?",
];

/* Família, amor e cuidado */
DonaRespostas.familia = [
  'Ah, família é tudo, meu filho! 👨‍👩‍👧‍👦 "Honra teu pai e tua mãe" (Êxodo 20:12). A família é o primeiro lugar onde aprendemos a amar. E é justamente pelas famílias que a gente trabalha aqui — cada cesta que entregamos é pra manter essas famílias de pé!',
  "Falar de família me aquece o coração! 💛 Sabe, a Bíblia diz que o amor é o laço perfeito (Colossenses 3:14). Cuidar da família, amar os filhos, honrar os mais velhos... isso é sagrado! Aqui na nossa ação social, lutamos pra que cada família tenha alimento, dignidade e esperança.",
  'A família é a base de tudo! 🏠 "Quanto a mim e à minha casa, serviremos ao Senhor" (Josué 24:15). Cada lar que a gente atende tem uma história linda — pais que batalham pelos filhos, avós que criam os netos com tanto amor. É por elas que a gente não para!',
  'Amo falar de família! 🌻 Aqui na Ação Social Semear, cada família recebe não só alimento — recebe atenção, carinho e oração. Porque toda família merece dignidade. "O amor suporta tudo, crê em tudo, espera tudo" (1 Coríntios 13:7).',
];

/* Igreja e comunidade de fé */
DonaRespostas.igreja = [
  'A Comunidade Evangélica Maanaim é o nosso lar espiritual! ⛪ Lá a gente se reúne pra adorar, crescer na Palavra e servir uns aos outros. A ação social nasceu justamente dessa visão de ser a mão de Deus no mundo. "Porque o Filho do Homem veio servir" (Marcos 10:45).',
  'A nossa igreja, a Maanaim, é um lugar de acolhimento e fé! 🙏 Maanaim significa "dois campos" em hebraico — um campo espiritual e um campo prático. E é exatamente isso que vivemos: fé e ação andando juntas! Você participa de alguma Igreja?',
  'A Comunidade Maanaim tem sido um instrumento de Deus aqui em Belém! ✨ Cultos de louvor e adoração, estudos bíblicos, grupos de jovens, ação social... "A fé sem obras é morta" (Tiago 2:26). Nossa fé se vive no servir ao próximo!',
];

/* Louvor e adoração */
DonaRespostas.louvor = [
  'Ah, o louvor é o oxigênio da alma! 🎵 "Cantai ao Senhor um cântico novo; cantai ao Senhor toda a terra!" (Salmo 96:1). Aqui na Maanaim, o louvor é cheio de vida e fervor. Que bom que você quer saber sobre isso!',
  'Louvor é comunicar amor a Deus com tudo que temos! 🎶 "Que todo ser vivo louve ao Senhor!" (Salmo 150:6). Na Comunidade Maanaim temos um ministério de louvor muito abençoado. A música transforma, cura e une corações!',
  'Quando o povo louva, Deus age! 🙌 Lembra de Paulo e Silas na prisão? "Por volta da meia-noite, Paulo e Silas oravam e cantavam hinos a Deus" (Atos 16:25). E Deus moveu! O louvor abre portas que nenhuma chave humana abre!',
];

/* Oração específica */
DonaRespostas.oracao_especial = [
  'A oração é a respiração da alma, meu filho! 🙏 "Orai sem cessar" (1 Tessalonicenses 5:17). Aqui na nossa ação social, cada cesta que preparamos é acompanhada de oração. Cada família que atendemos é lembrada no altar. Quer que eu ore por você agora?',
  'Que maravilha que quer falar de oração! 💛 "Tudo o que pedirdes em oração, crendo, recebereis" (Mateus 21:22). Na nossa página de voluntários tem um espaço para pedidos de oração — a gente intercede por cada pessoa! Quer enviar um pedido?',
  'A oração move montanhas, querido! ⛰️ "A oração do justo é poderosa e eficaz" (Tiago 5:16). Aqui na Maanaim temos grupos de intercessão que oram pelas famílias que atendemos, pelos voluntários e pelos doadores. Que Deus abençoe sua vida!',
];

/* Crianças e jovens */
DonaRespostas.criancas = [
  'As crianças são o nosso tesouro mais precioso! 👧👦 "Deixai as crianças virem a mim" (Mateus 19:14). Muitas das famílias que atendemos têm crianças pequenas — e ver o olhinho delas brilhar ao receber uma cesta... é o maior presente! Cada doação também é por elas.',
  'Ai, as crianças! ❤️ Jesus disse que "quem recebe uma criança em Meu nome, a Mim recebe" (Marcos 9:37). Aqui na ação social, lutamos pra que nenhuma criança durma com fome em Belém. Cada quilo de alimento doado é uma criança com mais saúde e alegria!',
  'As crianças merecem o melhor! 🌟 "Instrui o menino no caminho em que deve andar" (Provérbios 22:6). Muitas famílias que atendemos têm crianças em idade escolar — e uma criança bem alimentada aprende melhor, sonha mais alto e tem futuro mais bonito!',
];

/* Esperança e propósito */
DonaRespostas.esperanca = [
  '"Porque sou eu que conheço os planos que tenho a vosso respeito, diz o Senhor; planos de paz e não de calamidade, para vos dar um futuro e uma esperança." (Jeremias 29:11) 🌅 Esse versículo é o lema da nossa vida! Deus tem planos lindos pra você, querido.',
  'Esperança é o que não falta aqui! 🌿 "E a esperança não nos envergonha, porque o amor de Deus foi derramado em nossos corações." (Romanos 5:5). Cada família que atendemos precisa não só de comida — precisa de esperança, de saber que alguém se importa!',
  'A esperança é a âncora da alma! ⚓ "Esta esperança nós a temos como âncora da alma, segura e firme." (Hebreus 6:19). Em Belém, muitas famílias passam por dificuldades — mas a gente leva esperança junto com cada cesta! Você pode fazer parte disso!',
];

/* Amor ao próximo */
DonaRespostas.amor = [
  '"Amarás o teu próximo como a ti mesmo." (Marcos 12:31) 💛 Esse é o segundo maior mandamento! E é exatamente isso que fazemos aqui — amar o próximo de forma prática, com alimento, cuidado e presença. Cada doação é um ato de amor concreto!',
  'O amor verdadeiro se vê nas ações! 🤗 "Filhinhos, não amemos de palavra nem de língua, mas por obras e em verdade." (1 João 3:18). Por isso a gente não fica só na palavra — a gente vai lá, entrega as cestas, abraça as famílias e faz a diferença!',
  'Deus é amor, e quem ama conhece a Deus! ❤️ "Amados, amemo-nos uns aos outros; porque o amor é de Deus; e todo aquele que ama é nascido de Deus." (1 João 4:7). Quando você doa, você está expressando o amor de Deus por uma família que precisa!',
];

/* Cura e intercessão */
DonaRespostas.cura = [
  '"Ele mesmo levou os nossos pecados em seu corpo sobre o madeiro... por suas chagas fostes sarados." (1 Pedro 2:24) 🙏 Seja qual for a dor que você esteja sentindo — física, emocional, espiritual — há cura em Jesus! Posso orar por você?',
  'Cura é promessa de Deus! ✨ "Sou o Senhor que te curo." (Êxodo 15:26). Jesus sarou enfermos, abriu olhos de cegos, levantou paralíticos. E Ele continua fazendo milagres hoje! Se precisar de oração, pode me contar — a vovó intercede com fé!',
  '"Confessai as vossas ofensas uns aos outros, e orai uns pelos outros, para serdes curados." (Tiago 5:16) 💛 Na nossa comunidade Maanaim temos grupos de oração e intercessão. Se você tiver alguma necessidade, pode deixar seu pedido de oração na nossa página!',
];

/* ─── 2. PALAVRAS-CHAVE POR TEMA ─────────────────────────────────── */
/* Mapa de palavras-chave → tema para identificar a intenção do usuário */
var DonaKeywords = {
  saudacao: [
    "oi",
    "olá",
    "ola",
    "hey",
    "hello",
    "bom dia",
    "boa tarde",
    "boa noite",
    "eai",
    "e ai",
    "fala",
    "salve",
    "tudo bem",
    "tudo bom",
  ],
  doacao: [
    "doar",
    "doação",
    "doacao",
    "alimento",
    "cesta",
    "comida",
    "arroz",
    "feijão",
    "feijao",
    "leite",
    "contribuir",
    "alimentos",
    "quero doar",
    "como donar",
  ],
  voluntario: [
    "voluntário",
    "voluntario",
    "voluntária",
    "voluntaria",
    "quero ajudar",
    "participar",
    "cadastrar",
    "inscrever",
    "servir",
    "me voluntariar",
    "ser voluntario",
  ],
  missao: [
    "missão",
    "missao",
    "quem são",
    "quem sao",
    "sobre vocês",
    "sobre voces",
    "organização",
    "organizacao",
    "semear",
    "maanaim",
    "história",
    "historia",
    "o que fazem",
    "o que é isso",
  ],
  comoFunciona: [
    "como funciona",
    "como funciona",
    "como faz",
    "processo",
    "etapa",
    "passo a passo",
    "explica",
    "me explica",
    "entendo",
    "não entendo",
  ],
  galeria: [
    "galeria",
    "foto",
    "fotos",
    "imagem",
    "imagens",
    "vídeo",
    "video",
    "momentos",
    "registros",
  ],
  fe: [
    "versículo",
    "versiculo",
    "bíblia",
    "biblia",
    "deus",
    "oração",
    "oracao",
    "fé",
    "fe",
    "jesus",
    "palavra",
    "motivação",
    "motivacao",
  ],
  horario: [
    "horário",
    "horario",
    "hora",
    "funciona quando",
    "que horas",
    "quando abre",
    "quando fecha",
    "dias",
    "funcionamento",
  ],
  localizacao: [
    "onde fica",
    "endereço",
    "endereco",
    "localização",
    "localizacao",
    "como chegar",
    "onde são",
    "onde voces",
    "belem",
    "belém",
    "visitar",
  ],
  contato: [
    "contato",
    "whatsapp",
    "telefone",
    "ligar",
    "falar com",
    "fale conosco",
    "redes sociais",
    "instagram",
  ],
  agradecimento: [
    "obrigado",
    "obrigada",
    "valeu",
    "agradeço",
    "agradeco",
    "thanks",
    "brigado",
    "brigada",
    "muito obrigado",
  ],
  despedida: [
    "tchau",
    "bye",
    "até mais",
    "ate mais",
    "adeus",
    "falou",
    "flw",
    "fuiii",
    "até logo",
  ],
  recusa: [
    "código",
    "codigo",
    "admin",
    "banco de dados",
    "database",
    "localStorage",
    "javascript",
    "html",
    "css",
    "programação",
    "programacao",
    "senha",
    "login",
    "cpf",
    "dados pessoais",
    "api",
    "servidor",
    "bug",
    "erro",
  ],
  familia: [
    "família",
    "familia",
    "filhos",
    "filho",
    "filha",
    "pai",
    "mãe",
    "mae",
    "criança",
    "crianca",
    "bebê",
    "bebe",
    "esposa",
    "esposo",
    "marido",
    "casal",
    "parentes",
    "minha família",
    "minha familia",
    "lar",
    "casa",
  ],
  igreja: [
    "igreja",
    "comunidade",
    "maanaim",
    "templo",
    "culto",
    "reunião",
    "reuniao",
    "congregação",
    "congregacao",
    "pastor",
    "pregação",
    "pregacao",
    "ministério",
    "ministerio",
    "evangélica",
    "evangelica",
    "evangelho",
  ],
  louvor: [
    "louvor",
    "adoração",
    "adoracao",
    "música",
    "musica",
    "cantar",
    "cântico",
    "cantico",
    "hino",
    "worship",
    "instrumento",
    "banda",
  ],
  oracao_especial: [
    "orar",
    "interceder",
    "pedido de oração",
    "pedido de oracao",
    "preciso de oração",
    "preciso orar",
    "intercessão",
    "intercessao",
    "vigília",
    "vigilia",
    "jejum",
  ],
  criancas: [
    "criança",
    "criancas",
    "crianças",
    "crianca",
    "jovem",
    "jovens",
    "adolescente",
    "adolescentes",
    "menino",
    "menina",
    "infância",
    "infancia",
    "escola",
    "estudante",
  ],
  esperanca: [
    "esperança",
    "esperanca",
    "futuro",
    "propósito",
    "proposito",
    "sonho",
    "plano",
    "vida",
    "sentido",
    "significado",
    "razão de viver",
    "motivo",
  ],
  amor: [
    "amor",
    "amar",
    "amado",
    "amada",
    "bondade",
    "generosidade",
    "compaixão",
    "compaixao",
    "misericórdia",
    "misericordia",
    "graça",
    "graca",
    "cuidado",
  ],
  cura: [
    "cura",
    "curar",
    "saúde",
    "saude",
    "doença",
    "doenca",
    "doente",
    "hospital",
    "médico",
    "medico",
    "enfermidade",
    "milagre",
    "recuperação",
    "recuperacao",
  ],
};

/* ─── 2B. VARIÁVEIS DE CONTEXTO / MEMÓRIA ─────────────────────────── */
/* Nome do usuário (detectado durante a conversa) */
var _donaNomeUsuario = "";
/* Último tema detectado (para respostas contextuais) */
var _donaUltimoTema = "";

/* ─── 3. FUNÇÃO DE DETECÇÃO DE NOME ──────────────────────────────── */
/* Tenta extrair o nome do usuário a partir do texto */
function donaDetectarNome(texto) {
  var norm = texto.toLowerCase().trim();
  /* Padrões: "meu nome é X", "me chamo X", "sou X", "pode me chamar de X" */
  var padroes = [
    /meu nome (?:é|e) ([a-záàâãéêíóôõúüçñ]+)/i,
    /me chamo ([a-záàâãéêíóôõúüçñ]+)/i,
    /pode (?:me )?chamar (?:de )?([a-záàâãéêíóôõúüçñ]+)/i,
    /sou (?:o|a) ([a-záàâãéêíóôõúüçñ]+)/i,
    /sou ([a-záàâãéêíóôõúüçñ]+)$/i,
    /(?:oi|olá|ola),?\s+(?:sou |me chamo )?([a-záàâãéêíóôõúüçñ]{3,})/i,
  ];
  for (var i = 0; i < padroes.length; i++) {
    var m = norm.match(padroes[i]);
    if (m && m[1] && m[1].length > 2) {
      /* Capitaliza a primeira letra */
      return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    }
  }
  return null;
}

/* ─── 3B. FUNÇÃO DE DETECÇÃO DE INTENÇÃO ──────────────────────────── */
/* Analisa o texto do usuário e retorna o tema mais provável */
function donaDetectarIntencao(texto) {
  /* Normaliza o texto: minúsculas */
  var norm = texto.toLowerCase().trim();

  /* Percorre cada tema e verifica se alguma palavra-chave bate */
  var temas = Object.keys(DonaKeywords); /* lista de temas */
  for (var i = 0; i < temas.length; i++) {
    var tema = temas[i]; /* tema atual */
    var palavras = DonaKeywords[tema]; /* palavras-chave do tema */
    for (var j = 0; j < palavras.length; j++) {
      /* Se o texto contém a palavra-chave, retorna o tema */
      if (norm.indexOf(palavras[j]) !== -1) {
        return tema;
      }
    }
  }

  /* Se nenhuma palavra-chave bateu, retorna 'naoEntendi' */
  return "naoEntendi";
}

/* ─── 4. FUNÇÃO DE ESCOLHA ALEATÓRIA ─────────────────────────────── */
/* Escolhe uma resposta aleatória do array de um tema */
function donaEscolherResposta(tema) {
  var respostas = DonaRespostas[tema]; /* array de respostas do tema */
  if (!respostas || respostas.length === 0) {
    return DonaRespostas.naoEntendi[0]; /* fallback */
  }
  /* Índice aleatório entre 0 e (tamanho - 1) */
  var indice = Math.floor(Math.random() * respostas.length);
  return respostas[indice];
}

/* ─── 4B. RENDERIZADOR DE MARKDOWN BÁSICO ────────────────────────── */
/* Converte **negrito**, _itálico_ e \n em HTML seguro para as bolhas do bot */
function donaRenderMarkdown(texto) {
  /* Escapa HTML primeiro — evita XSS mesmo que o LLM retorne tags */
  var seg = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  /* Aplica formatação Markdown básica */
  seg = seg
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") /* **negrito** */
    .replace(/_(.+?)_/g, "<em>$1</em>") /* _itálico_  */
    .replace(/\n/g, "<br>"); /* quebras de linha */

  return seg;
}

/* ─── 4C. HOOK PARA LLM EXTERNO ───────────────────────────────────── */
/* Para integrar um modelo de linguagem (ex: OpenAI, Gemini, Claude),
   basta substituir window.DonaLLMHook por uma função assíncrona:

   window.DonaLLMHook = async function(texto, nomeUsuario, temaAnterior, callback) {
     var resposta = await minhaAPIDeLLM(texto);
     callback('llm', resposta);
   };

   Por padrão é null — usa o sistema local de palavras-chave. */
window.DonaLLMHook = null;

/* Roteador: usa LLM se disponível, senão cai no sistema local */
function donaConsultarResposta(texto, callback) {
  /* Se há um hook LLM registrado, delega pra ele */
  if (typeof window.DonaLLMHook === "function") {
    window.DonaLLMHook(texto, _donaNomeUsuario, _donaUltimoTema, callback);
    return;
  }

  /* Fallback — sistema local de palavras-chave */
  var tema = donaDetectarIntencao(texto);
  _donaUltimoTema = tema;
  var resposta = donaEscolherResposta(tema);
  callback(tema, resposta);
}

/* ─── 5. CRIAR INTERFACE DO CHAT ──────────────────────────────────── */
/* Injeta o HTML do chatbot na página (chamado no DOMContentLoaded) */
function donaCriarInterface() {
  /* Verifica se já existe para evitar duplicação */
  if (document.getElementById("dona-fab")) return;

  /* HTML do botão flutuante (FAB) */
  var fabHTML =
    '<button id="dona-fab" class="dona-fab" ' +
    'aria-label="Conversar com Dona Assunção" ' +
    'title="Falar com Dona Assunção">' +
    '<img src="img/dona-fab.jpeg" alt="Dona Assunção" ' +
    'style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />' +
    "</button>";

  /* HTML da janela do chat */
  var chatHTML =
    "" +
    '<div id="dona-chat" class="dona-chat" role="dialog" aria-label="Chat com Dona Assunção">' +
    /* Cabeçalho */
    '<div class="dona-chat-header">' +
    '<div class="dona-avatar">' +
    '<img src="img/dona-fab.jpeg" alt="Dona Assunção" ' +
    'style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />' +
    "</div>" +
    '<div class="dona-info">' +
    "<strong>Dona Assunção</strong>" +
    "<span>● online agora</span>" +
    "</div>" +
    '<button id="dona-close" class="dona-close" aria-label="Fechar chat">' +
    "&#10005;" +
    "</button>" +
    "</div>" +
    /* Área de mensagens */
    '<div id="dona-messages" class="dona-messages"></div>' +
    /* Sugestões rápidas */
    '<div id="dona-sugestoes" class="dona-sugestoes">' +
    '<button class="dona-sug-btn" data-msg="Como faço uma doação?">🍚 Doar</button>' +
    '<button class="dona-sug-btn" data-msg="Quero ser voluntário">🤝 Voluntário</button>' +
    '<button class="dona-sug-btn" data-msg="Qual a missão de vocês?">💛 Missão</button>' +
    '<button class="dona-sug-btn" data-msg="Me fala sobre a família">👨‍👩‍👧 Família</button>' +
    '<button class="dona-sug-btn" data-msg="Me fala da comunidade Maanaim">⛪ Igreja</button>' +
    '<button class="dona-sug-btn" data-msg="Me dá esperança">🌅 Esperança</button>' +
    '<button class="dona-sug-btn" data-msg="Preciso de oração">🙏 Oração</button>' +
    '<button class="dona-sug-btn" data-msg="Me diz um versículo sobre amor">❤️ Amor</button>' +
    '<button class="dona-sug-btn" data-msg="Como funciona?">📋 Como funciona</button>' +
    '<button class="dona-sug-btn" data-msg="Me mostra a galeria">📸 Galeria</button>' +
    "</div>" +
    /* Barra de input */
    '<div class="dona-input-bar">' +
    '<input type="text" id="dona-input" class="dona-input" placeholder="Digite sua mensagem..." autocomplete="off">' +
    '<button id="dona-send" class="dona-send" aria-label="Enviar">' +
    '<i class="fas fa-paper-plane"></i>' +
    "</button>" +
    "</div>" +
    "</div>";

  /* Injeta no final do body */
  var wrapper = document.createElement("div");
  wrapper.innerHTML = fabHTML + chatHTML;
  while (wrapper.firstChild) {
    document.body.appendChild(wrapper.firstChild);
  }
}

/* ─── 6. ADICIONAR MENSAGEM NA TELA ──────────────────────────────── */
/* Exibe uma bolha de mensagem na área de chat */
function donaAdicionarMsg(texto, tipo) {
  var container = document.getElementById("dona-messages");
  if (!container) return;

  /* Cria o elemento da mensagem */
  var msg = document.createElement("div");
  msg.className = "dona-msg " + tipo; /* tipo: 'bot' ou 'user' */

  /* Bot: renderiza Markdown (negrito, itálico, quebras de linha)
     User: textContent puro — nunca executa HTML digitado pelo usuário */
  if (tipo === "bot") {
    msg.innerHTML = donaRenderMarkdown(texto);
  } else {
    msg.textContent = texto;
  }

  /* Adiciona ao container */
  container.appendChild(msg);

  /* Scroll automático para a última mensagem */
  container.scrollTop = container.scrollHeight;
}

/* ─── 7. MOSTRAR INDICADOR DE DIGITAÇÃO ───────────────────────────── */
/* Exibe os 3 pontinhos enquanto "Dona está digitando" */
function donaMostrarDigitando() {
  var container = document.getElementById("dona-messages");
  if (!container) return;

  var typing = document.createElement("div");
  typing.className = "dona-typing";
  typing.id = "dona-typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

/* Remove o indicador de digitação */
function donaRemoverDigitando() {
  var typing = document.getElementById("dona-typing");
  if (typing) typing.remove();
}

/* ─── 8. PROCESSAR MENSAGEM DO USUÁRIO ────────────────────────────── */
/* Recebe o texto do usuário, detecta intenção e responde */
function donaProcessarMsg(texto) {
  if (!texto.trim()) return; /* ignora mensagens vazias */

  /* Exibe a mensagem do usuário */
  donaAdicionarMsg(texto, "user");

  /* Mostra indicador de digitação */
  donaMostrarDigitando();

  /* Tenta detectar nome do usuário */
  var nomeDetectado = donaDetectarNome(texto);
  if (nomeDetectado) {
    _donaNomeUsuario = nomeDetectado;
  }

  /* Consulta resposta: LLM externo (se configurado) ou palavras-chave local */
  donaConsultarResposta(texto, function (tema, resposta) {
    /* Personaliza a resposta com o nome se disponível */
    if (_donaNomeUsuario) {
      /* Se detectou o nome agora, responde com saudação personalizada */
      if (nomeDetectado) {
        resposta =
          "Que nome lindo! 😊 Prazer em te conhecer, **" +
          _donaNomeUsuario +
          "**! " +
          resposta;
      } else if (tema === "saudacao") {
        /* Em saudações, substitui os termos carinhosos genéricos pelo nome */
        resposta = resposta
          .replace("meu filho", _donaNomeUsuario)
          .replace("querido", _donaNomeUsuario)
          .replace("benzinho", _donaNomeUsuario);
      }
    }

    /* Simula tempo de digitação (800ms a 1500ms) — parece mais humano */
    var delay = 800 + Math.floor(Math.random() * 700);

    setTimeout(function () {
      donaRemoverDigitando(); /* remove pontinhos */
      donaAdicionarMsg(resposta, "bot"); /* exibe resposta com Markdown */
    }, delay);
  });
}

/* ─── 9. INICIALIZAÇÃO ────────────────────────────────────────────── */
/* Executa quando o DOM está completamente carregado */
document.addEventListener("DOMContentLoaded", function () {
  /* Cria a interface (FAB + janela do chat) */
  donaCriarInterface();

  /* ── Supabase Auth: pega nome do usuário logado (se houver) ── */
  /* Útil quando o admin (já autenticado) abre o chat — a Dona o cumprimenta pelo nome */
  if (window.supabaseClient && typeof supabaseClient.auth === "object") {
    supabaseClient.auth
      .getUser()
      .then(function (result) {
        var user = result && result.data && result.data.user;
        if (!user) return; /* visitante anônimo — sem nome */

        /* Tenta nome completo (Google OAuth) ou primeiro segmento do e-mail */
        var meta = user.user_metadata || {};
        var nomeCompleto = meta.full_name || meta.name || user.email || "";
        var primeiroNome =
          nomeCompleto.split(/[\s@]/)[0]; /* pega só o primeiro token */

        if (primeiroNome && primeiroNome.length > 1) {
          /* Capitaliza e salva na variável global do chatbot */
          _donaNomeUsuario =
            primeiroNome.charAt(0).toUpperCase() +
            primeiroNome.slice(1).toLowerCase();
        }
      })
      .catch(function () {
        /* silencia erros de rede — não bloqueia o chat */
      });
  }

  /* ── Abrir chat (clique no FAB) ── */
  var fab = document.getElementById("dona-fab");
  var chat = document.getElementById("dona-chat");

  if (fab && chat) {
    fab.addEventListener("click", function () {
      fab.classList.add("hidden"); /* esconde FAB */
      chat.classList.add("active"); /* mostra chat */

      /* Se é a primeira vez, manda saudação personalizada de boas-vindas */
      var msgs = document.getElementById("dona-messages");
      if (msgs && msgs.children.length === 0) {
        /* Saudação com nome quando o usuário está autenticado */
        var saudacaoNome = _donaNomeUsuario
          ? ", **" + _donaNomeUsuario + "**" /* ex: "Olá, Maria!" */
          : ""; /* visitante anônimo */
        var boasVindas =
          "Olá" +
          saudacaoNome +
          "! Eu sou a Dona Assunção 👵🏽💛 A vovó da Ação Social Semear! " +
          "Estou aqui pra te ajudar com informações. " +
          '_"O Senhor é bom para todos"_ (Salmo 145:9). Como posso te ajudar hoje?';
        donaAdicionarMsg(boasVindas, "bot");
      }
    });
  }

  /* ── Fechar chat ── */
  document.addEventListener("click", function (e) {
    if (e.target.id === "dona-close" || e.target.closest("#dona-close")) {
      if (chat) chat.classList.remove("active"); /* esconde chat */
      if (fab) fab.classList.remove("hidden"); /* mostra FAB */
    }
  });

  /* ── Enviar mensagem (botão) ── */
  document.addEventListener("click", function (e) {
    if (e.target.id === "dona-send" || e.target.closest("#dona-send")) {
      var input = document.getElementById("dona-input");
      if (input && input.value.trim()) {
        donaProcessarMsg(input.value); /* processa */
        input.value = ""; /* limpa input */
        input.focus(); /* mantém foco */
      }
    }
  });

  /* ── Enviar mensagem (Enter) ── */
  document.addEventListener("keydown", function (e) {
    if (e.target.id === "dona-input" && e.key === "Enter") {
      e.preventDefault(); /* evita submit de form */
      var input = e.target;
      if (input.value.trim()) {
        donaProcessarMsg(input.value); /* processa */
        input.value = ""; /* limpa */
      }
    }
  });

  /* ── Sugestões rápidas (delegação de eventos) ── */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".dona-sug-btn");
    if (btn) {
      var msg = btn.getAttribute("data-msg"); /* texto da sugestão */
      if (msg) {
        donaProcessarMsg(msg); /* processa como se o usuário digitou */
      }
    }
  });
});
