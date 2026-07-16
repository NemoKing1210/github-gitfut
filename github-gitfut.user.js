// ==UserScript==
// @name              GitHub GitFut
// @name:ru           GitHub GitFut
// @name:zh-CN        GitHub GitFut
// @name:es           GitHub GitFut
// @name:pt-BR        GitHub GitFut
// @name:de           GitHub GitFut
// @name:fr           GitHub GitFut
// @name:ja           GitHub GitFut
// @name:ko           GitHub GitFut
// @name:pl           GitHub GitFut
// @namespace         https://github.com/NemoKing1210/github-gitfut
// @version           1.4.0
// @description       Adds GitFut scouting cards on GitHub profiles and avatar hovercards
// @description:ru    Добавляет карточки GitFut на профили GitHub и в поповеры аватаров
// @description:zh-CN 在 GitHub 个人资料页与头像悬停卡片中显示 GitFut 球探信息
// @description:es    Añade cartas GitFut en perfiles y hovercards de avatar de GitHub
// @description:pt-BR  Adiciona cartas GitFut nos perfis e hovercards de avatar do GitHub
// @description:de     Zeigt GitFut-Karten auf GitHub-Profilen und Avatar-Hovercards
// @description:fr     Ajoute les cartes GitFut sur les profils et hovercards d’avatar GitHub
// @description:ja     GitHubプロフィールとアバターホバーカードにGitFut情報を表示
// @description:ko     GitHub 프로필과 아바타 호버카드에 GitFut 스카우트 정보를 표시
// @description:pl     Dodaje karty GitFut na profilach i hovercardach awatarów GitHub
// @author             NemoKing1210
// @tag                github
// @tag                gitfut
// @homepageURL        https://github.com/NemoKing1210/github-gitfut
// @supportURL         https://github.com/NemoKing1210/github-gitfut/issues
// @updateURL          https://raw.githubusercontent.com/NemoKing1210/github-gitfut/main/github-gitfut.user.js
// @downloadURL        https://raw.githubusercontent.com/NemoKing1210/github-gitfut/main/github-gitfut.user.js
// @license            MIT
// @icon               https://gitfut.com/favicon.ico
// @match              https://github.com/*
// @match              https://gist.github.com/*
// @grant              GM_xmlhttpRequest
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addStyle
// @grant              GM_registerMenuCommand
// @connect            gitfut.com
// @run-at             document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const API_BASE = 'https://gitfut.com/api/card';
  const SITE_BASE = 'https://gitfut.com';
  const REPO_URL = 'https://github.com/NemoKing1210/github-gitfut';
  const CACHE_KEY = 'gf_github_cache_v1';
  const SETTINGS_KEY = 'gf_github_settings';
  const CACHE_HOURS_MAX = 168;
  const DEFAULT_SETTINGS = {
    cacheHours: 12,
    showHovercard: true,
  };
  const MAX_CONCURRENT = 2;
  const REQUEST_DELAY_MS = 100;
  const CACHE_PERSIST_MS = 1000;
  const SCAN_DEBOUNCE_MS = 400;
  const PANEL_ID = 'gf-profile-panel';
  const HOVERCARD_BLOCK_ID = 'gf-hovercard-block';

  const RESERVED_PATHS = new Set([
    'about', 'account', 'actions', 'apps', 'blog', 'cache', 'codespaces', 'collections',
    'contact', 'copilot', 'customer', 'dashboard', 'developer', 'discussions', 'docs',
    'education', 'enterprise', 'events', 'explore', 'features', 'files', 'funding',
    'gist', 'home', 'issues', 'join', 'login', 'logout', 'marketplace', 'mcp',
    'new', 'notifications', 'organizations', 'orgs', 'packages', 'pages', 'pricing',
    'pulls', 'readme', 'search', 'security', 'sessions', 'settings', 'site', 'sponsors',
    'stars', 'topics', 'trending', 'users', 'watching', 'workflows',
  ]);

  const FINISH_COLORS = {
    bronze: {
      accent: '#CD7F32',
      ink: '#2A1A0C',
      soft: 'rgba(205,127,50,0.16)',
      glow: 'rgba(205,127,50,0.28)',
      deep: '#5a3412',
      shine: 'rgba(255,198,120,0.45)',
      tier: 1,
    },
    silver: {
      accent: '#AAB2BD',
      ink: '#1F242B',
      soft: 'rgba(170,178,189,0.2)',
      glow: 'rgba(180,190,205,0.4)',
      deep: '#3a4250',
      shine: 'rgba(255,255,255,0.55)',
      tier: 2,
    },
    gold: {
      accent: '#E6B422',
      ink: '#3A2806',
      soft: 'rgba(230,180,34,0.22)',
      glow: 'rgba(230,180,34,0.55)',
      deep: '#7a5608',
      shine: 'rgba(255,236,160,0.7)',
      tier: 3,
    },
    totw: {
      accent: '#E03E52',
      ink: '#4A0A14',
      soft: 'rgba(224,62,82,0.2)',
      glow: 'rgba(224,62,82,0.55)',
      deep: '#6a1020',
      shine: 'rgba(255,140,160,0.65)',
      tier: 4,
    },
    toty: {
      accent: '#3B7AFF',
      ink: '#10254F',
      soft: 'rgba(59,122,255,0.22)',
      glow: 'rgba(59,122,255,0.6)',
      deep: '#0a1f5c',
      shine: 'rgba(160,200,255,0.75)',
      tier: 5,
    },
    icon: {
      accent: '#F3D688',
      ink: '#2A1A45',
      soft: 'rgba(243,214,136,0.24)',
      glow: 'rgba(180,120,255,0.55)',
      deep: '#3a1a70',
      shine: 'rgba(255,240,200,0.85)',
      tier: 6,
    },
    founder: {
      accent: '#FF5A7A',
      ink: '#3A0A18',
      soft: 'rgba(255,90,122,0.22)',
      glow: 'rgba(255,90,122,0.6)',
      deep: '#5a1028',
      shine: 'rgba(255,180,200,0.8)',
      tier: 7,
    },
  };
  const FINISH_KEYS = Object.keys(FINISH_COLORS);
  const FINISH_CLASS_RE = /^gf-(?:hc|panel)-finish--/;

  const STAT_ORDER = [
    ['pac', 'PAC'],
    ['sho', 'SHO'],
    ['pas', 'PAS'],
    ['dri', 'DRI'],
    ['def', 'DEF'],
    ['phy', 'PHY'],
  ];

  const SUPPORTED_LOCALES = ['en', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'ja', 'ko', 'pl'];

  const TRANSLATIONS = {
    en: {
      loading: 'Scouting…',
      loadError: 'Scout failed',
      notFound: 'Not scouted',
      overall: 'OVR',
      position: 'POS',
      finish: 'Finish',
      archetype: 'Archetype',
      language: 'Language',
      playstyles: 'Playstyles',
      metrics: 'Scouting metrics',
      openReport: 'Open full scout report',
      duel: 'Duel a rival',
      menuSettings: 'GitHub GitFut — Settings',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · cache · display',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      saveReload: 'Save & Reload page',
      sectionDisplay: 'Display',
      sectionCache: 'Cache',
      showHovercard: 'Show GitFut in avatar hovercards',
      showHovercardHint: 'Injects OVR, position, and stats into GitHub’s user popover on avatar hover.',
      on: 'ON',
      off: 'OFF',
      cacheHours: 'Cache duration (hours)',
      cacheHoursHint: 'How long to reuse GitFut API results. 0 disables cache.',
      clearCache: 'Clear cache',
      cacheCleared: 'Cache cleared ({count})',
      cacheEmpty: 'Cache is empty',
      cacheClearHint: 'Removes all stored GitFut lookups from this browser profile.',
      repoLink: 'GitHub',
      repoAbout: 'Source code, updates, and issue reports',
      skillMoves: 'Skill moves',
      weakFoot: 'Weak foot',
      workRate: 'Work rate',
      style: 'Style',
    },
    ru: {
      loading: 'Скаутинг…',
      loadError: 'Ошибка скаутинга',
      notFound: 'Нет карточки',
      overall: 'OVR',
      position: 'ПОЗ',
      finish: 'Тир',
      archetype: 'Архетип',
      language: 'Язык',
      playstyles: 'Стили',
      metrics: 'Метрики скаутинга',
      openReport: 'Открыть полный отчёт',
      duel: 'Дуэль с соперником',
      menuSettings: 'GitHub GitFut — Настройки',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Скаутинг · кэш · отображение',
      close: 'Закрыть',
      cancel: 'Отмена',
      save: 'Сохранить',
      saveReload: 'Сохранить и перезагрузить',
      sectionDisplay: 'Отображение',
      sectionCache: 'Кэш',
      showHovercard: 'GitFut в поповере аватара',
      showHovercardHint: 'Добавляет OVR, позицию и статы в нативный hovercard GitHub при наведении на аватар.',
      on: 'ВКЛ',
      off: 'ВЫКЛ',
      cacheHours: 'Время кэша (часы)',
      cacheHoursHint: 'Как долго переиспользовать ответы API. 0 отключает кэш.',
      clearCache: 'Очистить кэш',
      cacheCleared: 'Кэш очищен ({count})',
      cacheEmpty: 'Кэш пуст',
      cacheClearHint: 'Удаляет все сохранённые запросы GitFut в этом профиле браузера.',
      repoLink: 'GitHub',
      repoAbout: 'Исходники, обновления и баг-репорты',
      skillMoves: 'Финты',
      weakFoot: 'Слабая нога',
      workRate: 'Работоспособность',
      style: 'Стиль',
    },
    zh: {
      loading: '球探中…',
      loadError: '球探失败',
      notFound: '无卡片',
      overall: 'OVR',
      position: '位置',
      finish: '品质',
      archetype: '原型',
      language: '语言',
      playstyles: '风格',
      metrics: '球探指标',
      openReport: '打开完整报告',
      duel: '对决对手',
      menuSettings: 'GitHub GitFut — 设置',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: '球探 · 缓存 · 显示',
      close: '关闭',
      cancel: '取消',
      save: '保存',
      saveReload: '保存并刷新',
      sectionDisplay: '显示',
      sectionCache: '缓存',
      showHovercard: '在头像悬停卡片中显示 GitFut',
      showHovercardHint: '悬停头像时在 GitHub 用户弹层中注入 OVR、位置与属性。',
      on: '开',
      off: '关',
      cacheHours: '缓存时长（小时）',
      cacheHoursHint: '复用 API 结果的时长。0 禁用缓存。',
      clearCache: '清空缓存',
      cacheCleared: '已清空 ({count})',
      cacheEmpty: '缓存为空',
      cacheClearHint: '删除本浏览器配置中保存的 GitFut 查询。',
      repoLink: 'GitHub',
      repoAbout: '源码、更新与问题反馈',
      skillMoves: '花式',
      weakFoot: '逆足',
      workRate: '积极性',
      style: '风格',
    },
    es: {
      loading: 'Scouting…',
      loadError: 'Scout fallido',
      notFound: 'Sin carta',
      overall: 'OVR',
      position: 'POS',
      finish: 'Acabado',
      archetype: 'Arquetipo',
      language: 'Lenguaje',
      playstyles: 'Estilos',
      metrics: 'Métricas',
      openReport: 'Abrir informe completo',
      duel: 'Duelo',
      menuSettings: 'GitHub GitFut — Ajustes',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · caché · pantalla',
      close: 'Cerrar',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveReload: 'Guardar y recargar',
      sectionDisplay: 'Pantalla',
      sectionCache: 'Caché',
      showHovercard: 'Mostrar GitFut en hovercards de avatar',
      showHovercardHint: 'Inyecta OVR, posición y stats en el popover nativo de GitHub.',
      on: 'ON',
      off: 'OFF',
      cacheHours: 'Duración de caché (horas)',
      cacheHoursHint: 'Cuánto reutilizar resultados de la API. 0 desactiva.',
      clearCache: 'Vaciar caché',
      cacheCleared: 'Caché vaciada ({count})',
      cacheEmpty: 'Caché vacía',
      cacheClearHint: 'Elimina búsquedas GitFut de este perfil.',
      repoLink: 'GitHub',
      repoAbout: 'Código, actualizaciones e issues',
      skillMoves: 'Regates',
      weakFoot: 'Pie malo',
      workRate: 'Trabajo',
      style: 'Estilo',
    },
    pt: {
      loading: 'Scouting…',
      loadError: 'Scout falhou',
      notFound: 'Sem carta',
      overall: 'OVR',
      position: 'POS',
      finish: 'Acabamento',
      archetype: 'Arquétipo',
      language: 'Linguagem',
      playstyles: 'Estilos',
      metrics: 'Métricas',
      openReport: 'Abrir relatório completo',
      duel: 'Duelo',
      menuSettings: 'GitHub GitFut — Configurações',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · cache · exibição',
      close: 'Fechar',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveReload: 'Salvar e recarregar',
      sectionDisplay: 'Exibição',
      sectionCache: 'Cache',
      showHovercard: 'Mostrar GitFut nos hovercards de avatar',
      showHovercardHint: 'Injeta OVR, posição e stats no popover nativo do GitHub.',
      on: 'ON',
      off: 'OFF',
      cacheHours: 'Duração do cache (horas)',
      cacheHoursHint: 'Por quanto tempo reutilizar a API. 0 desativa.',
      clearCache: 'Limpar cache',
      cacheCleared: 'Cache limpo ({count})',
      cacheEmpty: 'Cache vazio',
      cacheClearHint: 'Remove buscas GitFut deste perfil.',
      repoLink: 'GitHub',
      repoAbout: 'Código, atualizações e issues',
      skillMoves: 'Habilidades',
      weakFoot: 'Pé fraco',
      workRate: 'Dedicação',
      style: 'Estilo',
    },
    de: {
      loading: 'Scouting…',
      loadError: 'Scout fehlgeschlagen',
      notFound: 'Keine Karte',
      overall: 'OVR',
      position: 'POS',
      finish: 'Finish',
      archetype: 'Archetyp',
      language: 'Sprache',
      playstyles: 'Spielstile',
      metrics: 'Scout-Metriken',
      openReport: 'Vollen Bericht öffnen',
      duel: 'Duell',
      menuSettings: 'GitHub GitFut — Einstellungen',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · Cache · Anzeige',
      close: 'Schließen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      saveReload: 'Speichern & neu laden',
      sectionDisplay: 'Anzeige',
      sectionCache: 'Cache',
      showHovercard: 'GitFut in Avatar-Hovercards zeigen',
      showHovercardHint: 'Fügt OVR, Position und Stats in GitHubs User-Popover ein.',
      on: 'AN',
      off: 'AUS',
      cacheHours: 'Cache-Dauer (Stunden)',
      cacheHoursHint: 'Wie lange API-Ergebnisse wiederverwendet werden. 0 = aus.',
      clearCache: 'Cache leeren',
      cacheCleared: 'Cache geleert ({count})',
      cacheEmpty: 'Cache ist leer',
      cacheClearHint: 'Löscht gespeicherte GitFut-Lookups.',
      repoLink: 'GitHub',
      repoAbout: 'Quellcode, Updates und Issues',
      skillMoves: 'Tricks',
      weakFoot: 'Schwachfuß',
      workRate: 'Einsatz',
      style: 'Stil',
    },
    fr: {
      loading: 'Scouting…',
      loadError: 'Échec du scout',
      notFound: 'Pas de carte',
      overall: 'OVR',
      position: 'POS',
      finish: 'Finition',
      archetype: 'Archétype',
      language: 'Langage',
      playstyles: 'Styles',
      metrics: 'Métriques',
      openReport: 'Ouvrir le rapport complet',
      duel: 'Duel',
      menuSettings: 'GitHub GitFut — Réglages',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · cache · affichage',
      close: 'Fermer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saveReload: 'Enregistrer et recharger',
      sectionDisplay: 'Affichage',
      sectionCache: 'Cache',
      showHovercard: 'Afficher GitFut dans les hovercards d’avatar',
      showHovercardHint: 'Injecte OVR, poste et stats dans le popover natif de GitHub.',
      on: 'ON',
      off: 'OFF',
      cacheHours: 'Durée du cache (heures)',
      cacheHoursHint: 'Durée de réutilisation de l’API. 0 désactive.',
      clearCache: 'Vider le cache',
      cacheCleared: 'Cache vidé ({count})',
      cacheEmpty: 'Cache vide',
      cacheClearHint: 'Supprime les recherches GitFut de ce profil.',
      repoLink: 'GitHub',
      repoAbout: 'Code, mises à jour et issues',
      skillMoves: 'Gestes',
      weakFoot: 'Pied faible',
      workRate: 'Intensité',
      style: 'Style',
    },
    ja: {
      loading: 'スカウティング…',
      loadError: 'スカウト失敗',
      notFound: 'カードなし',
      overall: 'OVR',
      position: 'ポジ',
      finish: 'フィニッシュ',
      archetype: 'アーキタイプ',
      language: '言語',
      playstyles: 'プレースタイル',
      metrics: 'スカウト指標',
      openReport: 'フルレポートを開く',
      duel: 'デュエル',
      menuSettings: 'GitHub GitFut — 設定',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'スカウト · キャッシュ · 表示',
      close: '閉じる',
      cancel: 'キャンセル',
      save: '保存',
      saveReload: '保存して再読込',
      sectionDisplay: '表示',
      sectionCache: 'キャッシュ',
      showHovercard: 'アバターホバーカードにGitFutを表示',
      showHovercardHint: 'アバターホバー時にGitHubのユーザーポップオーバーへOVR等を挿入。',
      on: 'ON',
      off: 'OFF',
      cacheHours: 'キャッシュ時間（時間）',
      cacheHoursHint: 'API結果の再利用時間。0で無効。',
      clearCache: 'キャッシュ削除',
      cacheCleared: '削除しました ({count})',
      cacheEmpty: 'キャッシュは空です',
      cacheClearHint: 'このブラウザのGitFut照会を削除します。',
      repoLink: 'GitHub',
      repoAbout: 'ソース・更新・Issue',
      skillMoves: 'スキル',
      weakFoot: 'ウィークフット',
      workRate: 'ワークレート',
      style: 'スタイル',
    },
    ko: {
      loading: '스카우팅…',
      loadError: '스카우트 실패',
      notFound: '카드 없음',
      overall: 'OVR',
      position: '포지션',
      finish: '피니시',
      archetype: '아키타입',
      language: '언어',
      playstyles: '플레이스타일',
      metrics: '스카우트 지표',
      openReport: '전체 리포트 열기',
      duel: '듀얼',
      menuSettings: 'GitHub GitFut — 설정',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: '스카우팅 · 캐시 · 표시',
      close: '닫기',
      cancel: '취소',
      save: '저장',
      saveReload: '저장 후 새로고침',
      sectionDisplay: '표시',
      sectionCache: '캐시',
      showHovercard: '아바타 호버카드에 GitFut 표시',
      showHovercardHint: '아바타 호버 시 GitHub 사용자 팝오버에 OVR·포지션·스탯을 넣습니다.',
      on: 'ON',
      off: 'OFF',
      cacheHours: '캐시 시간(시간)',
      cacheHoursHint: 'API 결과 재사용 시간. 0이면 비활성.',
      clearCache: '캐시 비우기',
      cacheCleared: '비움 ({count})',
      cacheEmpty: '캐시가 비어 있음',
      cacheClearHint: '이 브라우저의 GitFut 조회를 삭제합니다.',
      repoLink: 'GitHub',
      repoAbout: '소스, 업데이트, 이슈',
      skillMoves: '스킬',
      weakFoot: '약발',
      workRate: '활동량',
      style: '스타일',
    },
    pl: {
      loading: 'Scouting…',
      loadError: 'Scout nieudany',
      notFound: 'Brak karty',
      overall: 'OVR',
      position: 'POZ',
      finish: 'Wykończenie',
      archetype: 'Archetyp',
      language: 'Język',
      playstyles: 'Style gry',
      metrics: 'Metryki',
      openReport: 'Otwórz pełny raport',
      duel: 'Pojedynek',
      menuSettings: 'GitHub GitFut — Ustawienia',
      btnTitle: 'GitHub GitFut',
      btnText: 'GitFut',
      panelTitle: 'GitFut',
      panelSubtitle: 'Scouting · cache · wyświetlanie',
      close: 'Zamknij',
      cancel: 'Anuluj',
      save: 'Zapisz',
      saveReload: 'Zapisz i odśwież',
      sectionDisplay: 'Wyświetlanie',
      sectionCache: 'Cache',
      showHovercard: 'Pokaż GitFut w hovercardach awatara',
      showHovercardHint: 'Wstawia OVR, pozycję i staty do natywnego popovera GitHub.',
      on: 'WŁ',
      off: 'WYŁ',
      cacheHours: 'Czas cache (godziny)',
      cacheHoursHint: 'Jak długo ponownie używać API. 0 wyłącza.',
      clearCache: 'Wyczyść cache',
      cacheCleared: 'Wyczyszczono ({count})',
      cacheEmpty: 'Cache pusty',
      cacheClearHint: 'Usuwa zapisane zapytania GitFut.',
      repoLink: 'GitHub',
      repoAbout: 'Kod, aktualizacje i zgłoszenia',
      skillMoves: 'Sztuczki',
      weakFoot: 'Słaba noga',
      workRate: 'Zaangażowanie',
      style: 'Styl',
    },
  };

  function resolveLocale() {
    const candidates = [navigator.language, ...(navigator.languages || [])];
    for (const candidate of candidates) {
      const raw = String(candidate).toLowerCase();
      const primary = raw.split('-')[0];
      if (SUPPORTED_LOCALES.includes(primary)) return primary;
      if (raw.startsWith('zh')) return 'zh';
      if (raw.startsWith('pt')) return 'pt';
    }
    return 'en';
  }

  const LOCALE = resolveLocale();

  /** @type {typeof DEFAULT_SETTINGS} */
  let settings = loadSettings();
  let panelOpen = false;

  function t(key, vars) {
    let text = TRANSLATIONS[LOCALE]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars && typeof vars === 'object') {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
      }
    }
    return text;
  }

  function normalizeCacheHours(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0) return DEFAULT_SETTINGS.cacheHours;
    return Math.min(n, CACHE_HOURS_MAX);
  }

  function loadSettings() {
    const raw = GM_getValue(SETTINGS_KEY, null);
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      cacheHours: normalizeCacheHours(raw.cacheHours),
      showHovercard:
        typeof raw.showHovercard === 'boolean'
          ? raw.showHovercard
          : raw.showInlineBadges !== false,
    };
  }

  function saveSettings(next) {
    settings = {
      ...settings,
      ...next,
      cacheHours: normalizeCacheHours(next.cacheHours ?? settings.cacheHours),
      showHovercard:
        typeof next.showHovercard === 'boolean'
          ? next.showHovercard
          : settings.showHovercard !== false,
    };
    GM_setValue(SETTINGS_KEY, settings);
    updateSettingsButtonState();
  }

  function getCacheTtlMs() {
    const hours = normalizeCacheHours(settings.cacheHours);
    return hours > 0 ? hours * 60 * 60 * 1000 : 0;
  }

  /** @type {Map<string, Promise<object|null>>} */
  const inflight = new Map();
  /** @type {Array<{ task: () => Promise<unknown>, resolve: Function, reject: Function }>} */
  const queue = [];
  let activeRequests = 0;
  /** @type {Record<string, unknown>|null} */
  let memoryCache = null;
  let cacheDirty = false;
  let cachePersistTimer = null;
  let scanTimer = null;
  let mutationObserver = null;
  let hovercardObserver = null;
  /** @type {number} */
  let hovercardSeq = 0;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function finishMeta(finish) {
    return FINISH_COLORS[finish] || FINISH_COLORS.bronze;
  }

  function isValidUsername(login) {
    if (!login || typeof login !== 'string') return false;
    const name = login.trim();
    if (name.length < 1 || name.length > 39) return false;
    if (RESERVED_PATHS.has(name.toLowerCase())) return false;
    return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(name);
  }

  function getProfileUsername() {
    if (location.hostname === 'gist.github.com') {
      const parts = location.pathname.split('/').filter(Boolean);
      return parts[0] && isValidUsername(parts[0]) ? parts[0] : null;
    }
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) return null;
    return isValidUsername(parts[0]) ? parts[0] : null;
  }

  function extractUsernameFromHref(href) {
    try {
      const url = new URL(href, location.origin);
      if (!/^(?:www\.)?github\.com$/.test(url.hostname) && url.hostname !== 'gist.github.com') {
        return null;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (!parts.length) return null;
      if (parts.length === 1 || (url.hostname === 'gist.github.com' && parts.length >= 1)) {
        return isValidUsername(parts[0]) ? parts[0] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  function loadMemoryCache() {
    if (memoryCache) return memoryCache;
    const raw = GM_getValue(CACHE_KEY, null);
    memoryCache = raw && typeof raw === 'object' ? raw : {};
    return memoryCache;
  }

  function persistCacheNow() {
    if (!cacheDirty || !memoryCache) return;
    GM_setValue(CACHE_KEY, memoryCache);
    cacheDirty = false;
  }

  function schedulePersistCache() {
    cacheDirty = true;
    if (cachePersistTimer) clearTimeout(cachePersistTimer);
    cachePersistTimer = setTimeout(() => {
      cachePersistTimer = null;
      persistCacheNow();
    }, CACHE_PERSIST_MS);
  }

  function getCached(login) {
    const cache = loadMemoryCache();
    const key = login.toLowerCase();
    const entry = cache[key];
    if (!entry || typeof entry !== 'object') return null;
    const ttl = getCacheTtlMs();
    if (ttl <= 0) return null;
    if (Date.now() - (entry.ts || 0) > ttl) {
      delete cache[key];
      schedulePersistCache();
      return null;
    }
    return entry.data ?? null;
  }

  function setCached(login, data) {
    const cache = loadMemoryCache();
    cache[login.toLowerCase()] = { ts: Date.now(), data };
    schedulePersistCache();
  }

  function clearCardCache() {
    const cache = loadMemoryCache();
    const count = Object.keys(cache).length;
    memoryCache = {};
    cacheDirty = true;
    persistCacheNow();
    return count;
  }

  function enqueue(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      pumpQueue();
    });
  }

  function pumpQueue() {
    while (activeRequests < MAX_CONCURRENT && queue.length) {
      const item = queue.shift();
      activeRequests += 1;
      Promise.resolve()
        .then(() => new Promise((r) => setTimeout(r, REQUEST_DELAY_MS)))
        .then(() => item.task())
        .then(item.resolve, item.reject)
        .finally(() => {
          activeRequests -= 1;
          pumpQueue();
        });
    }
  }

  function gmGetJson(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { Accept: 'application/json' },
        onload(res) {
          if (res.status === 404) {
            resolve(null);
            return;
          }
          if (res.status < 200 || res.status >= 300) {
            reject(new Error(`HTTP ${res.status}`));
            return;
          }
          try {
            resolve(JSON.parse(res.responseText));
          } catch (err) {
            reject(err);
          }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout')),
      });
    });
  }

  function fetchCard(login) {
    const key = login.toLowerCase();
    const cached = getCached(login);
    if (cached !== null && cached !== undefined) {
      return Promise.resolve(cached);
    }
    if (inflight.has(key)) return inflight.get(key);

    const promise = enqueue(() => gmGetJson(`${API_BASE}/${encodeURIComponent(login)}`))
      .then((data) => {
        setCached(login, data);
        return data;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, promise);
    return promise;
  }

  GM_addStyle(`
    :root {
      --gf-radius: 16px;
      --gf-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      --gf-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }

    #${PANEL_ID} {
      position: relative;
      isolation: isolate;
      font-family: var(--gf-font);
      margin: 0 0 16px;
      border: 1px solid color-mix(
        in srgb,
        var(--gf-finish-accent, #CD7F32) 48%,
        var(--borderColor-default, var(--color-border-default, #d0d7de))
      );
      border-radius: var(--gf-radius);
      background:
        radial-gradient(
          120% 80% at 0% 0%,
          var(--gf-finish-soft, rgba(205,127,50,0.16)),
          transparent 55%
        ),
        radial-gradient(
          90% 70% at 100% 100%,
          color-mix(in srgb, var(--gf-finish-glow, rgba(205,127,50,0.28)) 32%, transparent),
          transparent 60%
        ),
        var(--bgColor-default, var(--color-canvas-default, #fff));
      overflow: hidden;
      box-shadow:
        var(--gf-panel-outer-glow, 0 0 0 transparent),
        var(--gf-panel-ring, 0 0 0 1px transparent),
        0 8px 24px rgba(1, 4, 9, 0.1);
      transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
    }

    #${PANEL_ID} > .gf-panel-theme-fx {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    #${PANEL_ID} > .gf-panel-theme-fx + * {
      position: relative;
      z-index: 1;
    }

    .gf-panel-theme-fx__shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        115deg,
        transparent 35%,
        var(--gf-finish-shine, rgba(255,255,255,0.35)) 48%,
        transparent 62%
      );
      background-size: 220% 100%;
      background-position: 120% 0;
      opacity: 0;
    }

    #${PANEL_ID}.gf-panel-finish--bronze {
      --gf-hc-shine-opacity: 0;
      --gf-panel-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 24%, transparent);
      --gf-panel-outer-glow: 0 0 0 transparent;
    }

    #${PANEL_ID}.gf-panel-finish--silver {
      --gf-hc-shine-opacity: 0.16;
      --gf-panel-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 36%, transparent);
      --gf-panel-outer-glow: 0 0 18px color-mix(in srgb, var(--gf-finish-glow) 40%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--gold {
      --gf-hc-shine-opacity: 0.3;
      --gf-panel-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 50%, transparent);
      --gf-panel-outer-glow:
        0 0 22px color-mix(in srgb, var(--gf-finish-glow) 65%, transparent),
        0 0 40px color-mix(in srgb, var(--gf-finish-glow) 24%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--totw {
      --gf-hc-shine-opacity: 0.26;
      --gf-panel-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 55%, transparent);
      --gf-panel-outer-glow:
        0 0 24px color-mix(in srgb, var(--gf-finish-glow) 70%, transparent),
        0 0 48px color-mix(in srgb, var(--gf-finish-glow) 28%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--toty {
      --gf-hc-shine-opacity: 0.36;
      --gf-panel-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 60%, transparent);
      --gf-panel-outer-glow:
        0 0 28px color-mix(in srgb, var(--gf-finish-glow) 75%, transparent),
        0 0 56px color-mix(in srgb, var(--gf-finish-glow) 32%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--icon,
    #${PANEL_ID}.gf-panel-finish--founder {
      --gf-hc-shine-opacity: 0.42;
      --gf-panel-ring:
        inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 68%, transparent),
        inset 0 0 28px color-mix(in srgb, var(--gf-finish-soft) 50%, transparent);
      --gf-panel-outer-glow:
        0 0 30px color-mix(in srgb, var(--gf-finish-glow) 80%, transparent),
        0 0 60px color-mix(in srgb, var(--gf-finish-glow) 36%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--gold .gf-panel-theme-fx__shine,
    #${PANEL_ID}.gf-panel-finish--totw .gf-panel-theme-fx__shine,
    #${PANEL_ID}.gf-panel-finish--toty .gf-panel-theme-fx__shine,
    #${PANEL_ID}.gf-panel-finish--icon .gf-panel-theme-fx__shine,
    #${PANEL_ID}.gf-panel-finish--founder .gf-panel-theme-fx__shine {
      animation: gf-hc-shine-sweep 1.8s ease-in-out 1 forwards;
    }

    #${PANEL_ID}.gf-panel-finish--totw {
      animation: gf-panel-pulse-totw 2.4s ease-in-out infinite;
    }

    #${PANEL_ID}.gf-panel-finish--icon {
      animation: gf-panel-pulse-icon 2.8s ease-in-out infinite;
    }

    #${PANEL_ID}.gf-panel-finish--founder {
      animation: gf-panel-pulse-founder 2.2s ease-in-out infinite;
    }

    @keyframes gf-panel-pulse-totw {
      0%, 100% {
        box-shadow:
          0 0 20px color-mix(in srgb, var(--gf-finish-glow) 50%, transparent),
          0 0 36px color-mix(in srgb, var(--gf-finish-glow) 20%, transparent),
          inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 50%, transparent),
          0 8px 24px rgba(1, 4, 9, 0.1);
      }
      50% {
        box-shadow:
          0 0 32px color-mix(in srgb, var(--gf-finish-glow) 80%, transparent),
          0 0 56px color-mix(in srgb, var(--gf-finish-glow) 36%, transparent),
          inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 72%, transparent),
          0 10px 28px rgba(1, 4, 9, 0.14);
      }
    }

    @keyframes gf-panel-pulse-icon {
      0%, 100% {
        box-shadow:
          0 0 26px color-mix(in srgb, var(--gf-finish-glow) 55%, transparent),
          0 0 46px color-mix(in srgb, var(--gf-finish-accent) 24%, transparent),
          inset 0 0 22px color-mix(in srgb, var(--gf-finish-soft) 38%, transparent),
          0 8px 24px rgba(1, 4, 9, 0.12);
      }
      50% {
        box-shadow:
          0 0 40px color-mix(in srgb, var(--gf-finish-glow) 88%, transparent),
          0 0 68px color-mix(in srgb, var(--gf-finish-accent) 42%, transparent),
          inset 0 0 34px color-mix(in srgb, var(--gf-finish-soft) 52%, transparent),
          0 12px 30px rgba(1, 4, 9, 0.16);
      }
    }

    @keyframes gf-panel-pulse-founder {
      0%, 100% {
        box-shadow:
          0 0 28px color-mix(in srgb, var(--gf-finish-glow) 60%, transparent),
          0 0 50px color-mix(in srgb, var(--gf-finish-accent) 26%, transparent),
          inset 0 0 24px color-mix(in srgb, var(--gf-finish-soft) 42%, transparent),
          0 8px 24px rgba(1, 4, 9, 0.12);
      }
      50% {
        box-shadow:
          0 0 44px color-mix(in srgb, var(--gf-finish-glow) 92%, transparent),
          0 0 74px color-mix(in srgb, var(--gf-finish-accent) 46%, transparent),
          inset 0 0 38px color-mix(in srgb, var(--gf-finish-soft) 58%, transparent),
          0 12px 32px rgba(1, 4, 9, 0.18);
      }
    }

    .gf-panel__inner {
      position: relative;
      z-index: 1;
    }

    .gf-panel__head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 14px 12px;
      border-bottom: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 22%, transparent);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--gf-finish-soft, rgba(205,127,50,0.16)) 55%, transparent),
        transparent
      );
    }

    .gf-panel__ovr {
      flex: 0 0 auto;
      min-width: 56px;
      padding: 9px 11px;
      border-radius: 12px;
      background:
        linear-gradient(
          145deg,
          var(--gf-finish-shine, rgba(255,255,255,0.35)),
          var(--gf-finish-accent, #CD7F32) 40%,
          var(--gf-finish-deep, #5a3412)
        );
      color: var(--gf-finish-ink, #2A1A0C);
      text-align: center;
      line-height: 1.05;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--gf-finish-shine) 55%, transparent),
        0 0 0 1px color-mix(in srgb, var(--gf-finish-deep) 35%, transparent),
        var(--gf-panel-ovr-glow, none);
    }

    #${PANEL_ID}.gf-panel-finish--silver .gf-panel__ovr,
    #${PANEL_ID}.gf-panel-finish--gold .gf-panel__ovr {
      --gf-panel-ovr-glow: 0 0 14px color-mix(in srgb, var(--gf-finish-glow) 55%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--totw .gf-panel__ovr,
    #${PANEL_ID}.gf-panel-finish--toty .gf-panel__ovr,
    #${PANEL_ID}.gf-panel-finish--icon .gf-panel__ovr,
    #${PANEL_ID}.gf-panel-finish--founder .gf-panel__ovr {
      --gf-panel-ovr-glow:
        0 0 18px color-mix(in srgb, var(--gf-finish-glow) 75%, transparent),
        0 0 30px color-mix(in srgb, var(--gf-finish-glow) 35%, transparent);
    }

    .gf-panel__ovr-value {
      display: block;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 1px 0 color-mix(in srgb, var(--gf-finish-shine) 40%, transparent);
    }

    .gf-panel__ovr-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      opacity: 0.8;
      text-transform: uppercase;
    }

    .gf-panel__meta {
      min-width: 0;
      flex: 1;
    }

    .gf-panel__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
    }

    .gf-panel__name {
      font-size: 15px;
      font-weight: 700;
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gf-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      border: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 50%, transparent);
      background: color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 16%, transparent);
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      text-transform: uppercase;
    }

    #${PANEL_ID}.gf-panel-finish--gold .gf-chip,
    #${PANEL_ID}.gf-panel-finish--totw .gf-chip,
    #${PANEL_ID}.gf-panel-finish--toty .gf-chip,
    #${PANEL_ID}.gf-panel-finish--icon .gf-chip,
    #${PANEL_ID}.gf-panel-finish--founder .gf-chip {
      box-shadow: 0 0 8px color-mix(in srgb, var(--gf-finish-glow) 28%, transparent);
    }

    .gf-panel__blurb {
      margin: 5px 0 0;
      font-size: 12px;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
      line-height: 1.4;
    }

    .gf-panel__body {
      padding: 12px 14px 14px;
    }

    .gf-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin: 0 0 12px;
    }

    .gf-stat {
      border-radius: 10px;
      padding: 8px 8px;
      text-align: center;
      background: color-mix(
        in srgb,
        var(--gf-finish-soft, rgba(205,127,50,0.16)) 32%,
        var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa))
      );
      border: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 20%, transparent);
    }

    #${PANEL_ID}.gf-panel-finish--toty .gf-stat,
    #${PANEL_ID}.gf-panel-finish--icon .gf-stat,
    #${PANEL_ID}.gf-panel-finish--founder .gf-stat {
      border-color: color-mix(in srgb, var(--gf-finish-accent) 38%, transparent);
      box-shadow: inset 0 0 12px color-mix(in srgb, var(--gf-finish-soft) 38%, transparent);
    }

    .gf-stat__value {
      display: block;
      font-size: 16px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
    }

    .gf-stat__key {
      display: block;
      margin-top: 1px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    .gf-attrs {
      display: grid;
      gap: 6px;
      margin: 0 0 12px;
      padding: 10px 11px;
      border-radius: 10px;
      font-size: 12px;
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      background: color-mix(
        in srgb,
        var(--gf-finish-soft, rgba(205,127,50,0.16)) 18%,
        var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa))
      );
      border: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 14%, transparent);
    }

    .gf-attrs__row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .gf-attrs__label {
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    .gf-attrs__value {
      font-weight: 600;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .gf-playstyles {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 0 0 12px;
    }

    .gf-playstyle {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--bgColor-default, var(--color-canvas-default, #fff));
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
    }

    .gf-playstyle.is-plus {
      border-color: color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 55%, transparent);
      background: color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 14%, transparent);
      box-shadow: 0 0 8px color-mix(in srgb, var(--gf-finish-glow) 22%, transparent);
    }


    .gf-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .gf-btn-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none !important;
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      background: var(--bgColor-default, var(--color-canvas-default, #fff));
      color: var(--fgColor-default, var(--color-fg-default, #1f2328)) !important;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .gf-btn-link:hover {
      background: var(--control-transparent-bgColor-hover, rgba(208,215,222,0.32));
    }

    .gf-btn-link--primary {
      border-color: transparent;
      background:
        linear-gradient(
          145deg,
          var(--gf-finish-shine, rgba(255,255,255,0.35)),
          var(--gf-finish-accent, #CD7F32) 45%,
          var(--gf-finish-deep, #5a3412)
        );
      color: var(--gf-finish-ink, #2A1A0C) !important;
      box-shadow: 0 0 14px color-mix(in srgb, var(--gf-finish-glow) 38%, transparent);
    }

    .gf-btn-link--primary:hover {
      filter: brightness(1.06);
      background:
        linear-gradient(
          145deg,
          var(--gf-finish-shine, rgba(255,255,255,0.35)),
          var(--gf-finish-accent, #CD7F32) 45%,
          var(--gf-finish-deep, #5a3412)
        );
    }

    .gf-panel__status {
      padding: 16px 14px;
      font-size: 13px;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    .gf-panel__status.is-error {
      color: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
    }

    #${PANEL_ID} .gf-panel-skel .gf-skel {
      display: block;
      border-radius: 6px;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 10%, transparent) 0%,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 22%, transparent) 45%,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 10%, transparent) 90%
      );
      background-size: 220% 100%;
      animation: gf-skel-shimmer 1.35s ease-in-out infinite;
    }

    #${PANEL_ID} .gf-skel--panel-ovr {
      flex: 0 0 auto;
      width: 56px;
      height: 50px;
      border-radius: 12px;
    }

    #${PANEL_ID} .gf-skel--panel-name {
      width: 42%;
      height: 14px;
      border-radius: 4px;
    }

    #${PANEL_ID} .gf-skel--panel-chip {
      width: 48px;
      height: 18px;
      border-radius: 999px;
    }

    #${PANEL_ID} .gf-skel--panel-blurb {
      width: 78%;
      height: 11px;
      margin-top: 8px;
    }

    #${PANEL_ID} .gf-skel--panel-stat {
      height: 48px;
      border-radius: 10px;
    }

    #${PANEL_ID} .gf-skel--panel-attr {
      height: 12px;
      border-radius: 4px;
    }

    #${PANEL_ID} .gf-skel--panel-btn {
      width: 108px;
      height: 30px;
      border-radius: 8px;
    }

    #${PANEL_ID} .gf-skel--panel-btn-sm {
      width: 64px;
    }

    .Popover-message.gf-hc-themed {
      position: relative;
      isolation: isolate;
      border-radius: 16px !important;
      border-color: color-mix(
        in srgb,
        var(--gf-finish-accent, #CD7F32) 58%,
        var(--borderColor-default, #d0d7de)
      ) !important;
      background:
        radial-gradient(
          120% 80% at 0% 0%,
          var(--gf-finish-soft, rgba(205,127,50,0.16)),
          transparent 55%
        ),
        radial-gradient(
          90% 70% at 100% 100%,
          color-mix(in srgb, var(--gf-finish-glow, rgba(205,127,50,0.28)) 35%, transparent),
          transparent 60%
        ),
        var(--bgColor-default, var(--color-canvas-default, #fff)) !important;
      box-shadow:
        var(--gf-hc-outer-glow, 0 0 0 transparent),
        var(--gf-hc-ring, 0 0 0 1px transparent),
        0 10px 28px rgba(1, 4, 9, 0.2) !important;
      transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
    }

    .Popover-message.gf-hc-themed > .gf-hc-theme-fx {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .Popover-message.gf-hc-themed > .gf-hc-theme-fx + * {
      position: relative;
      z-index: 1;
    }

    .gf-hc-theme-fx__shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        115deg,
        transparent 35%,
        var(--gf-finish-shine, rgba(255,255,255,0.35)) 48%,
        transparent 62%
      );
      background-size: 220% 100%;
      background-position: 120% 0;
      opacity: 0;
    }

    .Popover-message.gf-hc-finish--bronze {
      --gf-hc-shine-opacity: 0;
      --gf-hc-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 28%, transparent);
      --gf-hc-outer-glow: 0 0 0 transparent;
    }

    .Popover-message.gf-hc-finish--silver {
      --gf-hc-shine-opacity: 0.18;
      --gf-hc-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 40%, transparent);
      --gf-hc-outer-glow: 0 0 16px color-mix(in srgb, var(--gf-finish-glow) 45%, transparent);
    }

    .Popover-message.gf-hc-finish--gold {
      --gf-hc-shine-opacity: 0.32;
      --gf-hc-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 55%, transparent);
      --gf-hc-outer-glow:
        0 0 22px color-mix(in srgb, var(--gf-finish-glow) 70%, transparent),
        0 0 40px color-mix(in srgb, var(--gf-finish-glow) 28%, transparent);
    }

    .Popover-message.gf-hc-finish--totw {
      --gf-hc-shine-opacity: 0.28;
      --gf-hc-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 60%, transparent);
      --gf-hc-outer-glow:
        0 0 24px color-mix(in srgb, var(--gf-finish-glow) 75%, transparent),
        0 0 48px color-mix(in srgb, var(--gf-finish-glow) 30%, transparent);
    }

    .Popover-message.gf-hc-finish--toty {
      --gf-hc-shine-opacity: 0.38;
      --gf-hc-ring: inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 65%, transparent);
      --gf-hc-outer-glow:
        0 0 28px color-mix(in srgb, var(--gf-finish-glow) 80%, transparent),
        0 0 56px color-mix(in srgb, var(--gf-finish-glow) 35%, transparent);
    }

    .Popover-message.gf-hc-finish--icon,
    .Popover-message.gf-hc-finish--founder {
      --gf-hc-shine-opacity: 0.45;
      --gf-hc-ring:
        inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 70%, transparent),
        inset 0 0 28px color-mix(in srgb, var(--gf-finish-soft) 55%, transparent);
      --gf-hc-outer-glow:
        0 0 32px color-mix(in srgb, var(--gf-finish-glow) 85%, transparent),
        0 0 64px color-mix(in srgb, var(--gf-finish-glow) 40%, transparent);
    }

    .Popover-message.gf-hc-finish--gold .gf-hc-theme-fx__shine,
    .Popover-message.gf-hc-finish--totw .gf-hc-theme-fx__shine,
    .Popover-message.gf-hc-finish--toty .gf-hc-theme-fx__shine,
    .Popover-message.gf-hc-finish--icon .gf-hc-theme-fx__shine,
    .Popover-message.gf-hc-finish--founder .gf-hc-theme-fx__shine {
      animation: gf-hc-shine-sweep 1.8s ease-in-out 1 forwards;
    }

    .Popover-message.gf-hc-finish--totw {
      animation: gf-hc-pulse-totw 2.4s ease-in-out infinite;
    }

    .Popover-message.gf-hc-finish--icon {
      animation: gf-hc-pulse-icon 2.8s ease-in-out infinite;
    }

    .Popover-message.gf-hc-finish--founder {
      animation: gf-hc-pulse-founder 2.2s ease-in-out infinite;
    }

    @keyframes gf-hc-shine-sweep {
      0% { background-position: 130% 0; opacity: 0; }
      12% { opacity: var(--gf-hc-shine-opacity, 0.3); }
      55% {
        background-position: -30% 0;
        opacity: calc(var(--gf-hc-shine-opacity, 0.3) * 1.15);
      }
      100% { background-position: -30% 0; opacity: 0; }
    }

    @keyframes gf-hc-pulse-totw {
      0%, 100% {
        box-shadow:
          0 0 22px color-mix(in srgb, var(--gf-finish-glow) 55%, transparent),
          0 0 40px color-mix(in srgb, var(--gf-finish-glow) 22%, transparent),
          inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 55%, transparent),
          0 10px 28px rgba(1, 4, 9, 0.2);
      }
      50% {
        box-shadow:
          0 0 34px color-mix(in srgb, var(--gf-finish-glow) 85%, transparent),
          0 0 60px color-mix(in srgb, var(--gf-finish-glow) 40%, transparent),
          inset 0 0 0 1px color-mix(in srgb, var(--gf-finish-accent) 75%, transparent),
          0 12px 32px rgba(1, 4, 9, 0.24);
      }
    }

    @keyframes gf-hc-pulse-icon {
      0%, 100% {
        box-shadow:
          0 0 28px color-mix(in srgb, var(--gf-finish-glow) 60%, transparent),
          0 0 50px color-mix(in srgb, var(--gf-finish-accent) 28%, transparent),
          inset 0 0 24px color-mix(in srgb, var(--gf-finish-soft) 40%, transparent),
          0 10px 28px rgba(1, 4, 9, 0.22);
      }
      50% {
        box-shadow:
          0 0 42px color-mix(in srgb, var(--gf-finish-glow) 90%, transparent),
          0 0 72px color-mix(in srgb, var(--gf-finish-accent) 45%, transparent),
          inset 0 0 36px color-mix(in srgb, var(--gf-finish-soft) 55%, transparent),
          0 14px 34px rgba(1, 4, 9, 0.26);
      }
    }

    @keyframes gf-hc-pulse-founder {
      0%, 100% {
        box-shadow:
          0 0 30px color-mix(in srgb, var(--gf-finish-glow) 65%, transparent),
          0 0 54px color-mix(in srgb, var(--gf-finish-accent) 30%, transparent),
          inset 0 0 26px color-mix(in srgb, var(--gf-finish-soft) 45%, transparent),
          0 10px 28px rgba(1, 4, 9, 0.22);
      }
      50% {
        box-shadow:
          0 0 46px color-mix(in srgb, var(--gf-finish-glow) 95%, transparent),
          0 0 78px color-mix(in srgb, var(--gf-finish-accent) 48%, transparent),
          inset 0 0 40px color-mix(in srgb, var(--gf-finish-soft) 60%, transparent),
          0 14px 36px rgba(1, 4, 9, 0.28);
      }
    }

    #${HOVERCARD_BLOCK_ID} {
      position: relative;
      z-index: 1;
      margin-top: 12px;
      padding: 12px 10px 10px;
      margin-left: -4px;
      margin-right: -4px;
      border-radius: 14px;
      border-top: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 35%, transparent);
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--gf-finish-soft, rgba(205,127,50,0.16)) 70%, transparent),
          transparent 85%
        );
      font-family: var(--gf-font);
      box-shadow: var(--gf-hc-block-glow, none);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--gold,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--totw,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--toty {
      --gf-hc-block-glow: inset 0 0 20px color-mix(in srgb, var(--gf-finish-soft) 45%, transparent);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--icon,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--founder {
      --gf-hc-block-glow:
        inset 0 0 28px color-mix(in srgb, var(--gf-finish-soft) 60%, transparent),
        0 0 18px color-mix(in srgb, var(--gf-finish-glow) 25%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__ovr {
      flex: 0 0 auto;
      min-width: 44px;
      padding: 6px 8px;
      border-radius: 8px;
      background:
        linear-gradient(
          145deg,
          var(--gf-finish-shine, rgba(255,255,255,0.35)),
          var(--gf-finish-accent, #CD7F32) 40%,
          var(--gf-finish-deep, #5a3412)
        );
      color: var(--gf-finish-ink, #2A1A0C);
      text-align: center;
      line-height: 1.05;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--gf-finish-shine) 55%, transparent),
        0 0 0 1px color-mix(in srgb, var(--gf-finish-deep) 35%, transparent),
        var(--gf-hc-ovr-glow, none);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--silver .gf-hc__ovr,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--gold .gf-hc__ovr {
      --gf-hc-ovr-glow: 0 0 12px color-mix(in srgb, var(--gf-finish-glow) 55%, transparent);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--totw .gf-hc__ovr,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--toty .gf-hc__ovr,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--icon .gf-hc__ovr,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--founder .gf-hc__ovr {
      --gf-hc-ovr-glow:
        0 0 16px color-mix(in srgb, var(--gf-finish-glow) 75%, transparent),
        0 0 28px color-mix(in srgb, var(--gf-finish-glow) 35%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__ovr-value {
      display: block;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 1px 0 color-mix(in srgb, var(--gf-finish-shine) 40%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__ovr-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.8;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__meta {
      min-width: 0;
      flex: 1;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 2px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-chip {
      border-color: color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 50%, transparent);
      background: color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 16%, transparent);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--gold .gf-chip,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--totw .gf-chip,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--toty .gf-chip,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--icon .gf-chip,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--founder .gf-chip {
      box-shadow: 0 0 8px color-mix(in srgb, var(--gf-finish-glow) 30%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__blurb {
      margin: 0;
      font-size: 11px;
      line-height: 1.35;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__stats {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 4px;
      margin: 0 0 8px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__stat {
      text-align: center;
      padding: 5px 2px;
      border-radius: 6px;
      background: color-mix(
        in srgb,
        var(--gf-finish-soft, rgba(205,127,50,0.16)) 35%,
        var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa))
      );
      border: 1px solid color-mix(in srgb, var(--gf-finish-accent, #CD7F32) 22%, transparent);
    }

    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--toty .gf-hc__stat,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--icon .gf-hc__stat,
    #${HOVERCARD_BLOCK_ID}.gf-hc-finish--founder .gf-hc__stat {
      border-color: color-mix(in srgb, var(--gf-finish-accent) 40%, transparent);
      box-shadow: inset 0 0 10px color-mix(in srgb, var(--gf-finish-soft) 40%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__stat-value {
      display: block;
      font-size: 13px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__stat-key {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__link {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none !important;
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      background: var(--bgColor-default, var(--color-canvas-default, #fff));
      color: var(--fgColor-default, var(--color-fg-default, #1f2328)) !important;
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__link--primary {
      border-color: transparent;
      background:
        linear-gradient(
          145deg,
          var(--gf-finish-shine, rgba(255,255,255,0.35)),
          var(--gf-finish-accent, #CD7F32) 45%,
          var(--gf-finish-deep, #5a3412)
        );
      color: var(--gf-finish-ink, #2A1A0C) !important;
      box-shadow: 0 0 12px color-mix(in srgb, var(--gf-finish-glow) 40%, transparent);
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__status {
      font-size: 12px;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    #${HOVERCARD_BLOCK_ID} .gf-hc__status.is-error {
      color: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel {
      display: block;
      border-radius: 6px;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 10%, transparent) 0%,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 22%, transparent) 45%,
        color-mix(in srgb, var(--fgColor-muted, #656d76) 10%, transparent) 90%
      );
      background-size: 220% 100%;
      animation: gf-skel-shimmer 1.35s ease-in-out infinite;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--ovr {
      flex: 0 0 auto;
      width: 44px;
      height: 42px;
      border-radius: 8px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--chip {
      width: 52px;
      height: 18px;
      border-radius: 999px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--blurb {
      width: 88%;
      height: 10px;
      margin-top: 6px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--blurb-short {
      width: 62%;
      margin-top: 5px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--stat {
      height: 36px;
      border-radius: 6px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--btn {
      width: 92px;
      height: 24px;
      border-radius: 6px;
    }

    #${HOVERCARD_BLOCK_ID} .gf-skel--btn-sm {
      width: 48px;
    }

    @keyframes gf-skel-shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .Popover-message.gf-hc-themed,
      .Popover-message.gf-hc-themed .gf-hc-theme-fx__shine {
        animation: none !important;
      }

      #${PANEL_ID},
      #${PANEL_ID} .gf-panel-theme-fx__shine {
        animation: none !important;
      }

      #${HOVERCARD_BLOCK_ID} .gf-skel,
      #${PANEL_ID} .gf-skel {
        animation: none !important;
        background: color-mix(in srgb, var(--fgColor-muted, #656d76) 14%, transparent);
      }
    }

    #gf-settings-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      background: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
    }

    #gf-settings-btn:hover,
    #gf-settings-btn.is-open {
      background: var(--control-transparent-bgColor-hover, rgba(208,215,222,0.32));
    }

    #gf-settings-btn .gf-header-btn__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--fgColor-muted, #8b949e);
    }

    #gf-settings-btn .gf-header-btn__dot.is-on {
      background: #3fb950;
    }

    .gf-settings-panel {
      position: fixed;
      z-index: 10000;
      width: 360px;
      max-width: calc(100vw - 16px);
      border-radius: 12px;
      border: 1px solid var(--borderColor-default, var(--color-border-default, #d0d7de));
      background: var(--bgColor-default, var(--color-canvas-default, #fff));
      box-shadow: 0 16px 40px rgba(1,4,9,0.28);
      font-family: var(--gf-font);
      color: var(--fgColor-default, var(--color-fg-default, #1f2328));
    }

    .gf-settings-panel[hidden] { display: none !important; }

    .gf-settings-panel__header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--borderColor-muted, rgba(27,31,36,0.08));
    }

    .gf-settings-panel__title {
      font-size: 15px;
      font-weight: 700;
    }

    .gf-settings-panel__subtitle {
      margin-top: 2px;
      font-size: 12px;
      color: var(--fgColor-muted, var(--color-fg-muted, #656d76));
    }

    .gf-settings-panel__close {
      border: 0;
      background: transparent;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      color: var(--fgColor-muted, #656d76);
    }

    .gf-settings-panel__section {
      padding: 12px 14px;
    }

    .gf-settings-panel__section-title {
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--fgColor-muted, #656d76);
    }

    .gf-field {
      display: grid;
      gap: 6px;
      margin-bottom: 8px;
    }

    .gf-field__label {
      font-size: 12px;
      font-weight: 600;
    }

    .gf-field input[type="number"],
    .gf-field select {
      width: 100%;
      padding: 7px 9px;
      border-radius: 6px;
      border: 1px solid var(--borderColor-default, #d0d7de);
      background: var(--bgColor-default, #fff);
      color: inherit;
    }

    .gf-hint {
      margin: 0 0 8px;
      font-size: 12px;
      color: var(--fgColor-muted, #656d76);
      line-height: 1.35;
    }

    .gf-switch {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }

    .gf-switch input { accent-color: #238636; }

    .gf-pill {
      margin-left: auto;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--bgColor-muted, #f6f8fa);
      color: var(--fgColor-muted, #656d76);
    }

    .gf-pill.is-on {
      background: rgba(46,160,67,0.15);
      color: #1a7f37;
    }

    .gf-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .gf-settings-panel__divider {
      height: 1px;
      background: var(--borderColor-muted, rgba(27,31,36,0.08));
      margin: 0 14px;
    }

    .gf-settings-panel__footer {
      padding: 12px 14px 14px;
    }

    .gf-settings-panel__footer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .gf-btn {
      appearance: none;
      border: 1px solid var(--borderColor-default, #d0d7de);
      background: var(--bgColor-muted, #f6f8fa);
      color: inherit;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .gf-btn--ghost { background: transparent; }
    .gf-btn--danger {
      border-color: rgba(209,36,47,0.35);
      color: #cf222e;
      background: rgba(209,36,47,0.06);
    }
    .gf-btn--green {
      border-color: transparent;
      background: #238636;
      color: #fff;
    }

    .gf-cache-status {
      min-height: 1.2em;
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--fgColor-muted, #656d76);
    }

    .gf-settings-panel__footer-divider {
      height: 1px;
      margin: 12px 0;
      background: var(--borderColor-muted, rgba(27,31,36,0.08));
    }

    .gf-settings-panel__repo {
      display: grid;
      gap: 2px;
      text-decoration: none !important;
      color: inherit !important;
    }

    .gf-settings-panel__repo-title { font-size: 13px; font-weight: 700; }
    .gf-settings-panel__repo-desc {
      font-size: 12px;
      color: var(--fgColor-muted, #656d76);
    }

    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID}, #${HOVERCARD_BLOCK_ID}, .gf-btn-link { transition: none !important; }
    }
  `);

  function normalizeFinish(finish) {
    const key = String(finish || 'bronze').toLowerCase();
    return FINISH_KEYS.includes(key) ? key : 'bronze';
  }

  function applyFinishVars(el, finish) {
    const meta = finishMeta(finish);
    el.style.setProperty('--gf-finish-accent', meta.accent);
    el.style.setProperty('--gf-finish-ink', meta.ink);
    el.style.setProperty('--gf-finish-soft', meta.soft);
    el.style.setProperty('--gf-finish-glow', meta.glow);
    el.style.setProperty('--gf-finish-deep', meta.deep);
    el.style.setProperty('--gf-finish-shine', meta.shine);
  }

  function clearFinishClasses(el) {
    if (!el?.classList) return;
    el.classList.remove('gf-hc-themed');
    for (const cls of [...el.classList]) {
      if (FINISH_CLASS_RE.test(cls)) el.classList.remove(cls);
    }
  }

  function clearHovercardTheme(popover) {
    const message = popover?.querySelector?.('.Popover-message') || popover;
    if (!(message instanceof HTMLElement)) return;
    clearFinishClasses(message);
    delete message.dataset.gfFinish;
    message.querySelector('.gf-hc-theme-fx')?.remove();
    for (const key of [
      '--gf-finish-accent',
      '--gf-finish-ink',
      '--gf-finish-soft',
      '--gf-finish-glow',
      '--gf-finish-deep',
      '--gf-finish-shine',
    ]) {
      message.style.removeProperty(key);
    }
  }

  function ensureHovercardThemeFx(message) {
    let fx = message.querySelector(':scope > .gf-hc-theme-fx');
    if (!fx) {
      fx = document.createElement('div');
      fx.className = 'gf-hc-theme-fx';
      fx.setAttribute('aria-hidden', 'true');
      message.insertBefore(fx, message.firstChild);
    }
    fx.innerHTML = '<div class="gf-hc-theme-fx__shine"></div>';
    return fx;
  }

  function applyHovercardTheme(popover, finish) {
    const message = popover?.querySelector?.('.Popover-message');
    if (!(message instanceof HTMLElement)) return;
    const key = normalizeFinish(finish);
    clearFinishClasses(message);
    message.classList.add('gf-hc-themed', `gf-hc-finish--${key}`);
    message.dataset.gfFinish = key;
    applyFinishVars(message, key);
    ensureHovercardThemeFx(message);
  }

  function renderStars(count) {
    const n = Math.max(0, Math.min(5, Number(count) || 0));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function buildProfilePanel(card) {
    const root = document.createElement('div');
    root.id = PANEL_ID;
    const finish = normalizeFinish(card.finish);
    root.classList.add(`gf-panel-finish--${finish}`);
    applyFinishVars(root, finish);
    root.dataset.gfFinish = finish;

    const report = card.report || {};
    const work = report.workRate || {};
    const playstyles = Array.isArray(report.playstyles) ? report.playstyles : [];
    const finishLabel = card.finishLabel || String(card.finish || '').toUpperCase();
    const cardUrl = `${SITE_BASE}/${encodeURIComponent(card.login)}`;
    const duelUrl = `${SITE_BASE}/${encodeURIComponent(card.login)}/vs`;
    const statsHtml = STAT_ORDER.map(
      ([key, label]) => `
        <div class="gf-stat">
          <span class="gf-stat__value">${escapeHtml(card.stats?.[key] ?? '—')}</span>
          <span class="gf-stat__key">${label}</span>
        </div>`
    ).join('');

    const playstylesHtml = playstyles.length
      ? `<div class="gf-playstyles" aria-label="${escapeHtml(t('playstyles'))}">
          ${playstyles
            .map(
              (ps) =>
                `<span class="gf-playstyle${ps.plus ? ' is-plus' : ''}" title="${escapeHtml(ps.reason || '')}">${escapeHtml(ps.name)}${ps.plus ? '+' : ''}</span>`
            )
            .join('')}
        </div>`
      : '';


    root.innerHTML = `
      <div class="gf-panel-theme-fx" aria-hidden="true"><div class="gf-panel-theme-fx__shine"></div></div>
      <div class="gf-panel__inner">
        <div class="gf-panel__head">
          <div class="gf-panel__ovr" title="${escapeHtml(t('overall'))}">
            <span class="gf-panel__ovr-value">${escapeHtml(card.overall)}</span>
            <span class="gf-panel__ovr-label">${escapeHtml(t('overall'))}</span>
          </div>
          <div class="gf-panel__meta">
            <div class="gf-panel__title-row">
              <span class="gf-panel__name">${escapeHtml(card.name || card.login)}</span>
              <span class="gf-chip">${escapeHtml(card.position || '—')}</span>
              <span class="gf-chip">${escapeHtml(finishLabel)}</span>
            </div>
            <p class="gf-panel__blurb">${escapeHtml(card.archetype || '')}${card.archetypeBlurb ? ` — ${escapeHtml(card.archetypeBlurb)}` : ''}</p>
          </div>
        </div>
        <div class="gf-panel__body">
          <div class="gf-stats">${statsHtml}</div>
          <div class="gf-attrs">
            <div class="gf-attrs__row"><span class="gf-attrs__label">${escapeHtml(t('skillMoves'))}</span><span class="gf-attrs__value">${escapeHtml(renderStars(report.skillMoves))}</span></div>
            <div class="gf-attrs__row"><span class="gf-attrs__label">${escapeHtml(t('weakFoot'))}</span><span class="gf-attrs__value">${escapeHtml(renderStars(report.weakFoot))}</span></div>
            <div class="gf-attrs__row"><span class="gf-attrs__label">${escapeHtml(t('workRate'))}</span><span class="gf-attrs__value">${escapeHtml(`${work.attack || '—'} / ${work.defense || '—'}`)}</span></div>
            <div class="gf-attrs__row"><span class="gf-attrs__label">${escapeHtml(t('style'))}</span><span class="gf-attrs__value">${escapeHtml(report.style || '—')}</span></div>
            ${
              card.topLanguage
                ? `<div class="gf-attrs__row"><span class="gf-attrs__label">${escapeHtml(t('language'))}</span><span class="gf-attrs__value">${escapeHtml(card.topLanguage)}</span></div>`
                : ''
            }
          </div>
          ${playstylesHtml}
          <div class="gf-actions">
            <a class="gf-btn-link gf-btn-link--primary" href="${escapeHtml(cardUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('openReport'))}</a>
            <a class="gf-btn-link" href="${escapeHtml(duelUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('duel'))}</a>
          </div>
        </div>
      </div>
    `;
    return root;
  }

  function buildLoadingPanel() {
    const root = document.createElement('div');
    root.id = PANEL_ID;
    root.dataset.gfState = 'loading';
    root.innerHTML = `
      <div class="gf-panel__inner gf-panel-skel" role="status" aria-busy="true" aria-label="${escapeHtml(t('loading'))}">
        <div class="gf-panel__head">
          <div class="gf-skel gf-skel--panel-ovr" aria-hidden="true"></div>
          <div class="gf-panel__meta">
            <div class="gf-panel__title-row">
              <span class="gf-skel gf-skel--panel-name" aria-hidden="true"></span>
              <span class="gf-skel gf-skel--panel-chip" aria-hidden="true"></span>
              <span class="gf-skel gf-skel--panel-chip" aria-hidden="true"></span>
            </div>
            <div class="gf-skel gf-skel--panel-blurb" aria-hidden="true"></div>
          </div>
        </div>
        <div class="gf-panel__body">
          <div class="gf-stats">
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--panel-stat" aria-hidden="true"></div>
          </div>
          <div class="gf-attrs">
            <div class="gf-skel gf-skel--panel-attr" aria-hidden="true" style="width:100%"></div>
            <div class="gf-skel gf-skel--panel-attr" aria-hidden="true" style="width:92%"></div>
            <div class="gf-skel gf-skel--panel-attr" aria-hidden="true" style="width:86%"></div>
            <div class="gf-skel gf-skel--panel-attr" aria-hidden="true" style="width:78%"></div>
          </div>
          <div class="gf-actions">
            <span class="gf-skel gf-skel--panel-btn" aria-hidden="true"></span>
            <span class="gf-skel gf-skel--panel-btn gf-skel--panel-btn-sm" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    `;
    return root;
  }

  function buildStatusPanel(text, isError) {
    const root = document.createElement('div');
    root.id = PANEL_ID;
    root.innerHTML = `<div class="gf-panel__status${isError ? ' is-error' : ''}">${escapeHtml(text)}</div>`;
    return root;
  }

  function findProfileMount() {
    const area = document.querySelector('.js-profile-editable-area');
    if (!area) return null;
    const followBlock = area.querySelector('.flex-order-1.flex-md-order-none');
    if (followBlock) return { parent: area, before: followBlock.nextSibling };
    const details = area.querySelector('.vcard-details');
    if (details) return { parent: area, before: details };
    return { parent: area, before: null };
  }

  function mountProfilePanel(node) {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
    const mount = findProfileMount();
    if (!mount) return false;
    mount.parent.insertBefore(node, mount.before);
    return true;
  }

  async function hydrateProfile(username) {
    if (!document.getElementById(PANEL_ID)) {
      mountProfilePanel(buildLoadingPanel());
    }

    try {
      const card = await fetchCard(username);
      if (getProfileUsername()?.toLowerCase() !== username.toLowerCase()) return;
      if (!card) {
        mountProfilePanel(buildStatusPanel(t('notFound'), false));
        return;
      }
      mountProfilePanel(buildProfilePanel(card));
    } catch {
      if (getProfileUsername()?.toLowerCase() === username.toLowerCase()) {
        mountProfilePanel(buildStatusPanel(t('loadError'), true));
      }
    }
  }

  function getHovercardLogin(popover) {
    const hydro = popover.querySelector('[data-hydro-view]');
    if (hydro) {
      try {
        const data = JSON.parse(hydro.getAttribute('data-hydro-view') || '');
        const login = data?.payload?.card_user_login;
        if (login && isValidUsername(login)) return login;
      } catch {
        /* ignore */
      }
    }

    const avatar = popover.querySelector('a.user-hovercard-avatar, img.user-hovercard-avatar-image');
    if (avatar) {
      const href = avatar.getAttribute('href') || avatar.closest('a')?.getAttribute('href');
      const fromHref = href ? extractUsernameFromHref(href) : null;
      if (fromHref) return fromHref;
      const alt = avatar.getAttribute('alt') || '';
      const m = alt.match(/^@?([A-Za-z0-9-]{1,39})$/);
      if (m && isValidUsername(m[1])) return m[1];
    }

    const loginLink = popover.querySelector('section[aria-label="User login and name"] a.Link--primary');
    if (loginLink) {
      const fromHref = extractUsernameFromHref(loginLink.href);
      if (fromHref) return fromHref;
    }

    return null;
  }

  function findHovercardMount(popover) {
    const hydro = popover.querySelector('[data-hydro-view]');
    if (hydro) return hydro;
    return popover.querySelector('.Popover-message > div > div') || popover.querySelector('.Popover-message');
  }

  function isVisibleHovercard(popover) {
    if (!popover || !(popover instanceof HTMLElement)) return false;
    if (popover.style.display === 'none') return false;
    const style = window.getComputedStyle(popover);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function renderHovercardContent(block, card) {
    const finish = normalizeFinish(card.finish);
    clearFinishClasses(block);
    block.classList.add(`gf-hc-finish--${finish}`);
    applyFinishVars(block, finish);
    block.dataset.gfFinish = finish;

    const finishLabel = card.finishLabel || finish.toUpperCase();
    const cardUrl = `${SITE_BASE}/${encodeURIComponent(card.login)}`;
    const duelUrl = `${SITE_BASE}/${encodeURIComponent(card.login)}/vs`;
    const statsHtml = STAT_ORDER.map(
      ([key, label]) => `
        <div class="gf-hc__stat">
          <span class="gf-hc__stat-value">${escapeHtml(card.stats?.[key] ?? '—')}</span>
          <span class="gf-hc__stat-key">${label}</span>
        </div>`
    ).join('');

    block.innerHTML = `
      <div class="gf-hc__head">
        <div class="gf-hc__ovr" title="${escapeHtml(t('overall'))}">
          <span class="gf-hc__ovr-value">${escapeHtml(card.overall)}</span>
          <span class="gf-hc__ovr-label">${escapeHtml(t('overall'))}</span>
        </div>
        <div class="gf-hc__meta">
          <div class="gf-hc__chips">
            <span class="gf-chip">${escapeHtml(card.position || '—')}</span>
            <span class="gf-chip">${escapeHtml(finishLabel)}</span>
            ${card.topLanguage ? `<span class="gf-chip">${escapeHtml(card.topLanguage)}</span>` : ''}
          </div>
          <p class="gf-hc__blurb">${escapeHtml(card.archetype || '')}${
            card.archetypeBlurb ? ` — ${escapeHtml(card.archetypeBlurb)}` : ''
          }</p>
        </div>
      </div>
      <div class="gf-hc__stats">${statsHtml}</div>
      <div class="gf-hc__actions">
        <a class="gf-hc__link gf-hc__link--primary" href="${escapeHtml(cardUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('openReport'))}</a>
        <a class="gf-hc__link" href="${escapeHtml(duelUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('duel'))}</a>
      </div>
    `;

    const popover = block.closest('.Popover.js-hovercard-content');
    if (popover) applyHovercardTheme(popover, finish);
  }

  function renderHovercardSkeleton() {
    return `
      <div class="gf-hc__skel" role="status" aria-busy="true" aria-label="${escapeHtml(t('loading'))}">
        <div class="gf-hc__head">
          <div class="gf-skel gf-skel--ovr" aria-hidden="true"></div>
          <div class="gf-hc__meta">
            <div class="gf-hc__chips">
              <span class="gf-skel gf-skel--chip" aria-hidden="true"></span>
              <span class="gf-skel gf-skel--chip" aria-hidden="true"></span>
            </div>
            <div class="gf-skel gf-skel--blurb" aria-hidden="true"></div>
            <div class="gf-skel gf-skel--blurb gf-skel--blurb-short" aria-hidden="true"></div>
          </div>
        </div>
        <div class="gf-hc__stats">
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
          <div class="gf-skel gf-skel--stat" aria-hidden="true"></div>
        </div>
        <div class="gf-hc__actions">
          <span class="gf-skel gf-skel--btn" aria-hidden="true"></span>
          <span class="gf-skel gf-skel--btn gf-skel--btn-sm" aria-hidden="true"></span>
        </div>
      </div>
    `;
  }

  async function hydrateHovercardBlock(block, login) {
    const seq = ++hovercardSeq;
    block.dataset.gfLogin = login.toLowerCase();
    block.dataset.gfState = 'loading';
    block.innerHTML = renderHovercardSkeleton();

    try {
      const card = await fetchCard(login);
      if (seq !== hovercardSeq) return;
      if (block.dataset.gfLogin !== login.toLowerCase()) return;
      if (!document.contains(block)) return;
      if (!card) {
        block.dataset.gfState = 'done';
        block.innerHTML = `<div class="gf-hc__status">${escapeHtml(t('notFound'))}</div>`;
        return;
      }
      renderHovercardContent(block, card);
      block.dataset.gfState = 'ready';
    } catch {
      if (seq !== hovercardSeq) return;
      if (!document.contains(block)) return;
      block.dataset.gfState = 'done';
      block.innerHTML = `<div class="gf-hc__status is-error">${escapeHtml(t('loadError'))}</div>`;
    }
  }

  function injectIntoHovercard(popover) {
    if (!settings.showHovercard) {
      popover.querySelector(`#${HOVERCARD_BLOCK_ID}`)?.remove();
      clearHovercardTheme(popover);
      return;
    }
    if (!isVisibleHovercard(popover)) {
      clearHovercardTheme(popover);
      return;
    }
    if (!popover.querySelector('.user-hovercard-avatar, [data-hydro-view*="user-hovercard"]')) {
      clearHovercardTheme(popover);
      return;
    }

    const login = getHovercardLogin(popover);
    if (!login) return;

    const mount = findHovercardMount(popover);
    if (!mount) return;

    let block = mount.querySelector(`#${HOVERCARD_BLOCK_ID}`);
    if (
      block &&
      block.dataset.gfLogin === login.toLowerCase() &&
      (block.dataset.gfState === 'loading' ||
        block.dataset.gfState === 'ready' ||
        block.dataset.gfState === 'done')
    ) {
      // Re-apply theme if GitHub rebuilt the Popover-message chrome
      if (block.dataset.gfState === 'ready' && block.dataset.gfFinish) {
        const message = popover.querySelector('.Popover-message');
        if (message && message.dataset.gfFinish !== block.dataset.gfFinish) {
          applyHovercardTheme(popover, block.dataset.gfFinish);
        }
      }
      return;
    }

    if (!block) {
      block = document.createElement('div');
      block.id = HOVERCARD_BLOCK_ID;
      mount.appendChild(block);
    }

    hydrateHovercardBlock(block, login);
  }

  function scanHovercards() {
    document.querySelectorAll('.Popover.js-hovercard-content').forEach((popover) => {
      injectIntoHovercard(popover);
    });
  }

  function ensureHovercardObserver() {
    if (hovercardObserver) return;
    let timer = null;
    hovercardObserver = new MutationObserver((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        const target = mutation.target;
        if (target instanceof Element) {
          if (
            target.classList?.contains('js-hovercard-content') ||
            target.classList?.contains('Popover-message') ||
            target.closest?.('.Popover.js-hovercard-content')
          ) {
            relevant = true;
            break;
          }
        }
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.classList?.contains('js-hovercard-content') ||
            node.querySelector?.('.js-hovercard-content, .user-hovercard-avatar')
          ) {
            relevant = true;
            break;
          }
        }
        if (relevant) break;
      }
      if (!relevant) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        scanHovercards();
      }, 50);
    });
    hovercardObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  function scanPage() {
    const username = getProfileUsername();
    if (username) {
      const existing = document.getElementById(PANEL_ID);
      const currentLogin = existing?.querySelector('.gf-panel__name')?.textContent?.trim();
      if (!existing || (existing.dataset.gfUser || '').toLowerCase() !== username.toLowerCase()) {
        if (existing) existing.remove();
        const loading = buildLoadingPanel();
        loading.dataset.gfUser = username;
        mountProfilePanel(loading);
        hydrateProfile(username).then(() => {
          const panel = document.getElementById(PANEL_ID);
          if (panel) panel.dataset.gfUser = username;
        });
      } else if (!currentLogin && existing.dataset.gfState !== 'loading' && !existing.querySelector('.gf-panel__status')) {
        hydrateProfile(username);
      }
    } else {
      document.getElementById(PANEL_ID)?.remove();
    }

    scanHovercards();
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scanPage();
    }, SCAN_DEBOUNCE_MS);
  }

  function ensureSettingsButton() {
    let btn = document.getElementById('gf-settings-btn');
    if (btn) return btn;

    const host =
      document.querySelector('.AppHeader-actions') ||
      document.querySelector('header .HeaderMenu-link-row') ||
      document.querySelector('header nav') ||
      document.querySelector('header');
    if (!host) return null;

    btn = document.createElement('button');
    btn.id = 'gf-settings-btn';
    btn.type = 'button';
    btn.title = t('btnTitle');
    btn.innerHTML = `<span>${escapeHtml(t('btnText'))}</span><span class="gf-header-btn__dot" id="gf-settings-dot"></span>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });
    host.appendChild(btn);
    ensurePanel();
    updateSettingsButtonState();
    return btn;
  }

  function updateSettingsButtonState() {
    const dot = document.getElementById('gf-settings-dot');
    const customized =
      settings.cacheHours !== DEFAULT_SETTINGS.cacheHours ||
      settings.showHovercard !== DEFAULT_SETTINGS.showHovercard;
    if (dot) {
      dot.classList.toggle('is-on', customized);
      dot.title = customized ? t('on') : t('off');
    }
  }

  function ensurePanel() {
    if (document.getElementById('gf-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'gf-panel';
    panel.className = 'gf-settings-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="gf-settings-panel__header">
        <div>
          <div class="gf-settings-panel__title">${escapeHtml(t('panelTitle'))}</div>
          <div class="gf-settings-panel__subtitle">${escapeHtml(t('panelSubtitle'))}</div>
        </div>
        <button type="button" class="gf-settings-panel__close" data-gf="close" aria-label="${escapeHtml(t('close'))}">×</button>
      </div>

      <div class="gf-settings-panel__section">
        <div class="gf-settings-panel__section-title">${escapeHtml(t('sectionDisplay'))}</div>
        <div class="gf-row" style="margin-bottom:10px">
          <label class="gf-switch">
            <input type="checkbox" id="gf-show-hovercard" />
            <span>${escapeHtml(t('showHovercard'))}</span>
          </label>
          <span class="gf-pill" id="gf-show-hovercard-pill">${escapeHtml(t('off'))}</span>
        </div>
        <p class="gf-hint">${escapeHtml(t('showHovercardHint'))}</p>
      </div>

      <div class="gf-settings-panel__divider"></div>

      <div class="gf-settings-panel__section">
        <div class="gf-settings-panel__section-title">${escapeHtml(t('sectionCache'))}</div>
        <label class="gf-field">
          <span class="gf-field__label">${escapeHtml(t('cacheHours'))}</span>
          <input type="number" id="gf-cache-hours" min="0" max="${CACHE_HOURS_MAX}" step="1" placeholder="12" inputmode="numeric" />
        </label>
        <p class="gf-hint">${escapeHtml(t('cacheHoursHint'))}</p>
        <button type="button" class="gf-btn gf-btn--danger" data-gf="clear-cache">${escapeHtml(t('clearCache'))}</button>
        <p class="gf-hint">${escapeHtml(t('cacheClearHint'))}</p>
        <p class="gf-cache-status" id="gf-cache-status" aria-live="polite"></p>
      </div>

      <div class="gf-settings-panel__footer">
        <div class="gf-settings-panel__footer-actions">
          <button type="button" class="gf-btn gf-btn--ghost" data-gf="close">${escapeHtml(t('cancel'))}</button>
          <button type="button" class="gf-btn" data-gf="save">${escapeHtml(t('save'))}</button>
          <button type="button" class="gf-btn gf-btn--green" data-gf="save-run">${escapeHtml(t('saveReload'))}</button>
        </div>
        <div class="gf-settings-panel__footer-divider" role="separator"></div>
        <a class="gf-settings-panel__repo" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">
          <span class="gf-settings-panel__repo-title">${escapeHtml(t('repoLink'))}</span>
          <span class="gf-settings-panel__repo-desc">${escapeHtml(t('repoAbout'))}</span>
        </a>
      </div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.querySelectorAll('[data-gf="close"]').forEach((el) =>
      el.addEventListener('click', () => togglePanel(false))
    );
    panel.querySelector('[data-gf="save"]').addEventListener('click', () => {
      persistPanelForm();
      togglePanel(false);
    });
    panel.querySelector('[data-gf="save-run"]').addEventListener('click', () => {
      persistPanelForm();
      togglePanel(false);
      location.reload();
    });
    panel.querySelector('[data-gf="clear-cache"]').addEventListener('click', () => {
      const count = clearCardCache();
      const status = panel.querySelector('#gf-cache-status');
      if (status) status.textContent = count > 0 ? t('cacheCleared', { count }) : t('cacheEmpty');
    });

    panel.querySelector('#gf-show-hovercard').addEventListener('change', syncDisplayPills);

    document.addEventListener('click', (e) => {
      if (!panelOpen) return;
      const btn = document.getElementById('gf-settings-btn');
      if (panel.contains(/** @type {Node} */ (e.target)) || btn?.contains(/** @type {Node} */ (e.target))) {
        return;
      }
      togglePanel(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelOpen) togglePanel(false);
    });
  }

  function syncDisplayPills() {
    const panel = document.getElementById('gf-panel');
    if (!panel) return;
    const hoverOn = panel.querySelector('#gf-show-hovercard').checked;
    const hoverPill = panel.querySelector('#gf-show-hovercard-pill');
    hoverPill.textContent = hoverOn ? t('on') : t('off');
    hoverPill.classList.toggle('is-on', hoverOn);
  }

  function fillPanelForm() {
    const panel = document.getElementById('gf-panel');
    if (!panel) return;
    panel.querySelector('#gf-show-hovercard').checked = settings.showHovercard !== false;
    panel.querySelector('#gf-cache-hours').value = String(normalizeCacheHours(settings.cacheHours));
    const status = panel.querySelector('#gf-cache-status');
    if (status) status.textContent = '';
    syncDisplayPills();
  }

  function persistPanelForm() {
    const panel = document.getElementById('gf-panel');
    if (!panel) return;
    saveSettings({
      showHovercard: panel.querySelector('#gf-show-hovercard').checked,
      cacheHours: normalizeCacheHours(panel.querySelector('#gf-cache-hours').value),
    });
  }

  function togglePanel(force) {
    ensurePanel();
    const panel = document.getElementById('gf-panel');
    const btn = document.getElementById('gf-settings-btn');
    if (!panel) return;

    panelOpen = typeof force === 'boolean' ? force : !panelOpen;
    panel.hidden = !panelOpen;
    btn?.classList.toggle('is-open', panelOpen);

    if (panelOpen) {
      fillPanelForm();
      positionPanel();
    }
  }

  function positionPanel() {
    const panel = document.getElementById('gf-panel');
    const btn = document.getElementById('gf-settings-btn');
    if (!panel || !btn) return;

    const rect = btn.getBoundingClientRect();
    const width = 360;
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;

    panel.style.top = `${Math.round(rect.bottom + 8)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }

  function onSoftNavigation() {
    scheduleScan();
    ensureSettingsButton();
  }

  function init() {
    loadMemoryCache();
    window.addEventListener('pagehide', persistCacheNow);
    ensureSettingsButton();

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand(t('menuSettings'), () => {
        ensureSettingsButton();
        togglePanel(true);
      });
    }

    scheduleScan();
    ensureHovercardObserver();

    mutationObserver = new MutationObserver((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.id === PANEL_ID ||
            node.id === 'gf-panel' ||
            node.id === 'gf-settings-btn' ||
            node.id === HOVERCARD_BLOCK_ID
          ) {
            continue;
          }
          if (
            node.matches?.(
              '.js-profile-editable-area, .Layout-sidebar, .Popover.js-hovercard-content, main'
            ) ||
            node.querySelector?.(
              '.js-profile-editable-area, .Popover.js-hovercard-content, .AppHeader-actions'
            )
          ) {
            relevant = true;
            break;
          }
        }
        if (relevant) break;
      }
      if (!relevant) return;
      ensureSettingsButton();
      scheduleScan();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('turbo:load', onSoftNavigation);
    document.addEventListener('turbo:render', onSoftNavigation);
    document.addEventListener('pjax:end', onSoftNavigation);
    document.addEventListener('soft-nav:success', onSoftNavigation);
    window.addEventListener('popstate', onSoftNavigation);
  }

  init();
})();
