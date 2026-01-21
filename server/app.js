import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const debugAccessLog = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  // Serve static assets from the original Source directory so paths remain stable.
  app.use(express.static(path.join(rootDir, 'Source')));

  function getParam(req, key) {
    const raw = req.query[key] ?? req.body?.[key];
    if (raw === undefined || raw === null) return '';
    if (Array.isArray(raw)) return raw[0] ?? '';
    if (typeof raw === 'string') return raw;
    return String(raw);
  }

  function decodeBase64(value) {
    if (!value) return '';
    try {
      const decoded = Buffer.from(String(value), 'base64').toString('utf8');
      return decoded.trim();
    } catch (err) {
      return '';
    }
  }

  function sanitizeUrlValue(value) {
    if (!value) return '';
    return String(value).replace(/[\r\n]/g, '').trim();
  }

  function sanitizeLayout(layoutRaw) {
    const cleaned = sanitizeUrlValue(layoutRaw);
    if (!cleaned) return 'css/default.css';

    if (/^https?:\/\//i.test(cleaned)) {
      return cleaned;
    }

    if (/^css\//i.test(cleaned)) {
      if (/\.css$/i.test(cleaned)) return cleaned;
      return `${cleaned}.css`;
    }

    if (/\.css$/i.test(cleaned)) {
      return `css/${cleaned}`;
    }

    return `css/${cleaned}.css`;
  }

  function parseOptions(optionsStr) {
    const optionsArray = optionsStr ? optionsStr.split('--') : [];
    const has = (flag) => optionsArray.includes(flag);

    let wsServer = '';
    for (const entry of optionsArray) {
      if (entry.includes('WEBSOCKETURL')) {
        wsServer = sanitizeUrlValue(entry.replace('WEBSOCKETURL', ''));
        break;
      }
    }

    let layout = '';
    for (const entry of optionsArray) {
      if (entry.includes('WEBPHONELAYOUT')) {
        layout = sanitizeLayout(entry.replace('WEBPHONELAYOUT', ''));
        break;
      }
    }

    return {
      debugEnabled: has('DEBUG'),
      hideDialpad: has('DIALPAD_N'),
      hideDialbox: has('DIALBOX_N'),
      hideMute: has('MUTE_N'),
      hideVolume: has('VOLUME_N'),
      autoAnswer: has('AUTOANSWER_Y'),
      wsServer,
      layout,
    };
  }

  function buildViciPhoneConfig(req) {
    const phoneLogin = decodeBase64(getParam(req, 'phone_login'));
    const phonePass = decodeBase64(getParam(req, 'phone_pass'));
    const serverIp = decodeBase64(getParam(req, 'server_ip'));
    const optionsStr = decodeBase64(getParam(req, 'options'));

    const parsedOptions = parseOptions(optionsStr);
    const layout = parsedOptions.layout || 'css/default.css';
    const wsServer = parsedOptions.wsServer;

    return {
      layout,
      cid_name: phoneLogin,
      sip_uri: phoneLogin && serverIp ? `${phoneLogin}@${serverIp}` : '',
      auth_user: phoneLogin,
      password: phonePass,
      ws_server: wsServer,
      debug_enabled: parsedOptions.debugEnabled,
      hide_dialpad: parsedOptions.hideDialpad,
      hide_dialbox: parsedOptions.hideDialbox,
      hide_mute: parsedOptions.hideMute,
      hide_volume: parsedOptions.hideVolume,
      auto_answer: parsedOptions.autoAnswer,
    };
  }

  function toBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const lowered = String(value).toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(lowered);
  }

  function buildInterpreterConfig(req) {
    return {
      layout: sanitizeLayout(getParam(req, 'layout') || 'css/default.css'),
      cid_name: getParam(req, 'cid_name') || '100',
      sip_uri: getParam(req, 'sip_uri') || '100@192.168.0.100',
      auth_user: getParam(req, 'auth_user') || '100',
      password: getParam(req, 'password') || '1234',
      ws_server: sanitizeUrlValue(getParam(req, 'ws_server') || 'wss://yourdialerurl.com/8089'),
      debug_enabled: toBoolean(getParam(req, 'debug_enabled'), false),
      hide_dialpad: toBoolean(getParam(req, 'hide_dialpad'), false),
      hide_dialbox: toBoolean(getParam(req, 'hide_dialbox'), false),
      hide_mute: toBoolean(getParam(req, 'hide_mute'), false),
      hide_volume: toBoolean(getParam(req, 'hide_volume'), false),
      auto_answer: toBoolean(getParam(req, 'auto_answer'), false),
    };
  }

  function buildExampleConfig() {
    return {
      layout: 'css/default.css',
      cid_name: '100',
      sip_uri: '100@192.168.0.100',
      auth_user: '100',
      password: '1234',
      ws_server: 'wss://yourdialerurl.com/8089',
      debug_enabled: true,
      hide_dialpad: false,
      hide_dialbox: false,
      hide_mute: false,
      hide_volume: false,
      auto_answer: true,
    };
  }

  function logAccess(req) {
    const ref = req.get('referer') || 'https://phone.vicloudservices.co';
    let baseRef = ref;
    try {
      const parsed = new URL(ref);
      baseRef = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch (err) {
      baseRef = ref;
    }

    const parts = [
      new Date().toISOString().replace('T', ' ').split('.')[0],
      req.ip || '',
      baseRef,
      req.get('user-agent') || '',
      '', // browser info placeholder
    ];

    console.log(parts.join('\t'));
  }

  app.all('/viciphone', (req, res) => {
    const config = buildViciPhoneConfig(req);
    if (debugAccessLog) {
      logAccess(req);
    }
    res.render('vp_template', config);
  });

  app.all('/vp_interpreter', (req, res) => {
    const config = buildInterpreterConfig(req);
    res.render('vp_template', config);
  });

  app.all('/vp_int_example', (req, res) => {
    const config = buildExampleConfig();
    res.render('vp_template', config);
  });

  app.get('/', (req, res) => {
    res.redirect('/viciphone');
  });

  return app;
}

export default createApp;
