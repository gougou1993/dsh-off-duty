/**
 * Client half of the off-duty reminder bundle.
 *
 * Left sidebar entry + main panel: configure the off-work time, custom rotating
 * messages, animation style and sound. A slide-in banner fires at the configured
 * time (weekdays only), with a check-in flow and a localStorage-backed calendar.
 * All rendering uses React elements; user text is never interpreted as HTML.
 */
window.__ModuleLoader__.load({
  id: '@oakzhong/dsh-off-duty',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React

    const NS = 'dsh-off-duty'
    const PANEL_ID = 'off-duty'
    const STYLE_ID = 'dsh-off-duty/css'
    const CFG_KEY = 'dsh-off-duty.config.v1'
    const LOG_KEY = 'dsh-off-duty.checkins.v1'

    const DEFAULT_MESSAGES = [
      'Are you ready? Go go go! 下班？',
      'Are you ok? 该打卡啦～',
      '今天也辛苦了，收拾东西回家吧 ✨',
      '今天也辛苦了，给你加个大鸡腿 🍗',
      '代码先放着，生活要发车 🚗',
    ]

    const DEFAULT_CFG = {
      time: '18:00',          // 下班时间 HH:mm
      weekdaysOnly: true,     // 仅工作日
      enabled: true,
      messages: DEFAULT_MESSAGES.slice(),
      interval: 4,            // 轮播间隔(秒)
      animation: 'slide',     // slide | fade | typewriter
      sound: 'chime',         // 提示音：chime/bell/ding/marimba/beep/off
      level: 'banner',        // banner | overlay
    }

    const zh = {
      title: '下班铃', subtitle: '到点提醒，开心下班。',
      settings: '设置', countdown: '距下班', clock: '当前时间',
      time: '下班时间', weekdaysOnly: '仅工作日提醒', enabled: '启用提醒',
      messages: '提醒文案（每行一条）', messagesHint: '到点后按顺序轮播展示',
      interval: '轮播间隔(秒)', animation: '动画效果', sound: '提示音',
      soundHint: '选择提醒音效，可点试听', soundTry: '试听',
      sndChime: '和弦（默认）', sndBell: '钟声', sndDing: '叮咚', sndMarimba: '马林巴', sndBeep: '电子音', sndOff: '关闭',
      level: '提醒方式', levelBanner: '横幅', levelOverlay: '全屏',
      animSlide: '从左到右', animFade: '淡入淡出', animType: '打字机',
      save: '保存设置', saved: '已保存', reset: '恢复默认',
      checkin: '打卡下班', later: '再干一会', dismiss: '关闭',
      checkedToday: '今天已打卡 ✓', snoozed: '已延后 {n} 分钟',
      streak: '连续打卡', days: '天', thisMonth: '本月打卡', total: '累计',
      calendar: '打卡日历', noCheckins: '还没有打卡记录，到点试试吧～',
      preview: '预览效果', previewHint: '点这里立即看一次提醒动画',
      goOff: '下班时间到！', test: '测试提醒',
      mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日',
      ready: '准备好了吗？', ok: '还好吗？', goodnight: '辛苦了，回家吧！',
    }
    const en = {
      title: 'Off-duty bell', subtitle: 'A happy nudge when it is time to go home.',
      settings: 'Settings', countdown: 'Time to off-work', clock: 'Now',
      time: 'Off-work time', weekdaysOnly: 'Weekdays only', enabled: 'Enable reminder',
      messages: 'Reminder messages (one per line)', messagesHint: 'Shown in rotation when time is up',
      interval: 'Rotate every (s)', animation: 'Animation', sound: 'Sound',
      soundHint: 'Choose a reminder sound, click Preview to try', soundTry: 'Try',
      sndChime: 'Chord (default)', sndBell: 'Bell', sndDing: 'Ding', sndMarimba: 'Marimba', sndBeep: 'Beep', sndOff: 'Off',
      level: 'Reminder style', levelBanner: 'Banner', levelOverlay: 'Fullscreen',
      animSlide: 'Slide in', animFade: 'Fade', animType: 'Typewriter',
      save: 'Save', saved: 'Saved', reset: 'Reset',
      checkin: 'Clock out', later: 'Later', dismiss: 'Close',
      checkedToday: 'Checked in today ✓', snoozed: 'Snoozed {n} min',
      streak: 'Streak', days: 'days', thisMonth: 'This month', total: 'Total',
      calendar: 'Check-in calendar', noCheckins: 'No check-ins yet, try when the bell rings～',
      preview: 'Preview', previewHint: 'Click to see the reminder animation now',
      goOff: 'Time to go home!', test: 'Test reminder',
      mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
      ready: 'Ready?', ok: 'Are you ok?', goodnight: 'Good work, go home!',
    }
    let t = (key) => (zh[key] || key)
    const fmt = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''))

    // ---- storage helpers ---------------------------------------------------
    function readJSON(key, fallback) {
      try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch (_) { return fallback }
    }
    function writeJSON(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)) } catch (_) {}
    }
    function todayKey(d) {
      const dt = d || new Date()
      const p = (n) => String(n).padStart(2, '0')
      return dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate())
    }
    function isWorkday(d) {
      const day = (d || new Date()).getDay()
      return day >= 1 && day <= 5
    }

    // ---- module-level styles ----------------------------------------------
    function installStyles() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
.dshOff-root{display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:16px 18px;gap:12px;overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}
.dshOff-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex:0 0 auto}
.dshOff-title{font-size:20px;font-weight:700}
.dshOff-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.dshOff-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:14px;display:flex;flex-direction:column;gap:10px}
.dshOff-cardTitle{font-size:13px;font-weight:600}
.dshOff-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
@media(max-width:860px){.dshOff-grid{grid-template-columns:1fr}}
.dshOff-clock{font-size:34px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:1px}
.dshOff-count{font-size:13px;color:var(--dsw-alias-label-secondary)}
.dshOff-count b{color:#ff6b35;font-size:18px;font-variant-numeric:tabular-nums}
.dshOff-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dshOff-input,.dshOff-select,.dshOff-textarea{padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;outline:none;font-family:inherit;min-width:0}
.dshOff-input:focus,.dshOff-select:focus,.dshOff-textarea:focus{border-color:#ff6b35}
.dshOff-textarea{width:100%;box-sizing:border-box;min-height:96px;resize:vertical;line-height:1.5}
.dshOff-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:inherit;white-space:nowrap}
.dshOff-btnPrimary{background:linear-gradient(135deg,#ff9a3c,#ff5e62);color:#fff;border-color:transparent;font-weight:600}
.dshOff-cb{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.dshOff-stats{display:flex;gap:18px;flex-wrap:wrap}
.dshOff-stat{display:flex;flex-direction:column;gap:2px}
.dshOff-stat b{font-size:22px;color:#ff6b35}
.dshOff-stat span{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshOff-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.dshOff-calHead{font-size:10px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dshOff-cell{aspect-ratio:1;border-radius:6px;background:var(--dsw-alias-bg-layer-2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshOff-cellOn{background:linear-gradient(135deg,#ff9a3c,#ff5e62);color:#fff;font-weight:600}
.dshOff-cellToday{outline:2px solid #ff6b35;outline-offset:1px}
.dshOff-note{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5}
/* reminder banner: slides in from the right */
.dshOff-banner{position:fixed;top:64px;right:24px;z-index:9999;max-width:420px;background:linear-gradient(135deg,#ff9a3c,#ff5e62);color:#fff;border-radius:14px;padding:16px 20px;box-shadow:0 12px 36px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:10px}
/* slide: from right */
.dshOff-banner.dshOff-animSlideIn{animation:dshOffSlideIn .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes dshOffSlideIn{from{transform:translateX(130%);opacity:0}to{transform:translateX(0);opacity:1}}
/* fade: scale + opacity */
.dshOff-banner.dshOff-animFadeIn{animation:dshOffFadeIn .6s ease both}
@keyframes dshOffFadeIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
/* typewriter: gentle pop, caret handled on text */
.dshOff-banner.dshOff-animTypeIn{animation:dshOffTypeIn .4s ease both}
@keyframes dshOffTypeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.dshOff-caret::after{content:'▍';animation:dshOffBlink .8s steps(1) infinite}
@keyframes dshOffBlink{50%{opacity:0}}
.dshOff-bannerMsg{font-size:16px;font-weight:700;min-height:24px}
.dshOff-bannerBtns{display:flex;gap:8px}
.dshOff-bannerBtn{border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.15);color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.dshOff-bannerBtnMain{background:#fff;color:#ff5e62;border-color:#fff;font-weight:700}
/* fullscreen overlay */
.dshOff-overlay{position:fixed;inset:0;z-index:10000;background:rgba(20,12,8,.9);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;opacity:0;transition:opacity .4s}
.dshOff-overlayIn{opacity:1}
.dshOff-overlayMsg.dshOff-animSlideIn{animation:dshOffSlideIn .7s cubic-bezier(.2,.8,.2,1) both}
.dshOff-overlayMsg.dshOff-animFadeIn{animation:dshOffFadeIn .6s ease both}
.dshOff-overlayMsg.dshOff-animTypeIn{animation:dshOffTypeIn .4s ease both}
.dshOff-overlayMsg{font-size:40px;font-weight:800;color:#fff;text-align:center;padding:0 24px;min-height:60px}
.dshOff-overlayBtns{display:flex;gap:14px}
.dshOff-overlayBtn{border:0;border-radius:10px;padding:12px 26px;font-size:15px;cursor:pointer;font-family:inherit;font-weight:600}
.dshOff-confetti{position:fixed;inset:0;pointer-events:none;z-index:10001;overflow:hidden}
.dshOff-bit{position:absolute;top:-16px;width:10px;height:16px;opacity:.9;animation:dshOffFall linear forwards}
@keyframes dshOffFall{to{transform:translateY(105vh) rotate(720deg);opacity:0}}
      `
      document.head.appendChild(style)
    }

    // ---- sound (Web Audio, no external file) -------------------------------
    let audioCtx = null
    // Six synthesized chimes (Web Audio, no external files).
    const SOUND_PRESETS = ['chime', 'bell', 'ding', 'marimba', 'beep', 'off']
    function tone(ctx, freq, start, dur, type, vol) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type || 'sine'; osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(vol || 0.18, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(start); osc.stop(start + dur + 0.02)
    }
    function playChime(sound) {
      const kind = (typeof sound === 'string') ? sound : (sound === false ? 'off' : 'chime')
      if (!kind || kind === 'off') return
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        if (!audioCtx) audioCtx = new AC()
        const n = audioCtx.currentTime
        if (kind === 'chime') {
          // 三音上行和弦（默认）
          ;[523.25, 659.25, 783.99].forEach((f, i) => tone(audioCtx, f, n + i * 0.14, 0.5, 'sine', 0.18))
        } else if (kind === 'bell') {
          // 钟声：主音 + 泛音，长衰减
          tone(audioCtx, 440, n, 1.4, 'sine', 0.22)
          tone(audioCtx, 880, n, 1.0, 'sine', 0.08)
          tone(audioCtx, 1320, n, 0.7, 'sine', 0.04)
        } else if (kind === 'ding') {
          // 清脆双击叮
          tone(audioCtx, 1046.5, n, 0.3, 'sine', 0.2)
          tone(audioCtx, 1318.5, n + 0.16, 0.35, 'sine', 0.18)
        } else if (kind === 'marimba') {
          // 马林巴：方波柔和短促
          ;[392, 523.25, 659.25, 783.99].forEach((f, i) => tone(audioCtx, f, n + i * 0.1, 0.28, 'triangle', 0.16))
        } else if (kind === 'beep') {
          // 电子提示音：三短同频
          ;[0, 0.18, 0.36].forEach((t) => tone(audioCtx, 880, n + t, 0.12, 'square', 0.1))
        }
      } catch (_) {}
    }

    // ---- main panel --------------------------------------------------------
    function OffDutyPanel({ ctx }) {
      const [cfg, setCfg] = useState(() => {
        const saved = readJSON(CFG_KEY, {})
        // legacy: sound was boolean
        if (typeof saved.sound === 'boolean') saved.sound = saved.sound ? 'chime' : 'off'
        return { ...DEFAULT_CFG, ...saved }
      })
      const [checkins, setCheckins] = useState(() => readJSON(LOG_KEY, []))
      const [now, setNow] = useState(new Date())
      const [toast, setToast] = useState('')
      const firedRef = useRef('')

      // ticking clock + due check (every second)
      useEffect(() => {
        const id = setInterval(() => {
          const d = new Date()
          setNow(d)
          if (!cfg.enabled) return
          if (cfg.weekdaysOnly && !isWorkday(d)) return
          const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
          const key = todayKey(d)
          if (hhmm >= cfg.time && firedRef.current !== key && !checkins.includes(key)) {
            firedRef.current = key
            startReminder(false)
          }
        }, 1000)
        return () => clearInterval(id)
      }, [cfg, checkins])

      const dismissReminder = useCallback(() => {
        if (liveReminder) { try { liveReminder.cleanup() } catch (_) {} }
      }, [])

      const startReminder = useCallback((fromTest) => {
        const msgs = (cfg.messages && cfg.messages.length) ? cfg.messages : DEFAULT_MESSAGES
        if (cfg.sound && cfg.sound !== 'off') playChime(cfg.sound)
        // Use DOM-level reminder: guaranteed animation, not clipped by panel.
        showReminderDOM(cfg, t, {
          onCheckin: () => {
            const key = todayKey()
            setCheckins((prev) => prev.includes(key) ? prev : [...prev, key].sort())
            setToast(t('checkedToday'))
          },
          onLater: () => {
            setToast(fmt(t('snoozed'), { n: 15 }))
            setTimeout(() => { firedRef.current = '' }, 15 * 60 * 1000)
          },
        })
      }, [cfg])

      const doCheckin = useCallback(() => {
        const key = todayKey()
        setCheckins((prev) => prev.includes(key) ? prev : [...prev, key].sort())
        dismissReminder()
        setToast(t('checkedToday'))
      }, [dismissReminder])

      const doLater = useCallback(() => {
        dismissReminder()
        setToast(fmt(t('snoozed'), { n: 15 }))
        // snooze 15 min: allow re-fire later this session
        setTimeout(() => { firedRef.current = '' }, 15 * 60 * 1000)
      }, [dismissReminder])

      // stats
      const stats = useMemo(() => {
        const nowD = new Date()
        const monthPrefix = String(nowD.getFullYear()) + '-' + String(nowD.getMonth() + 1).padStart(2, '0')
        const monthCount = checkins.filter((k) => k.startsWith(monthPrefix)).length
        // streak: consecutive days counting back from today or yesterday
        let streak = 0
        const cur = new Date()
        if (!checkins.includes(todayKey(cur))) cur.setDate(cur.getDate() - 1)
        while (checkins.includes(todayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1) }
        return { monthCount, streak, total: checkins.length }
      }, [checkins])

      // countdown
      const countdown = useMemo(() => {
        const [hh, mm] = (cfg.time || '18:00').split(':').map(Number)
        const target = new Date(now)
        target.setHours(hh || 18, mm || 0, 0, 0)
        let diff = target.getTime() - now.getTime()
        if (diff < 0) diff += 24 * 3600 * 1000
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
      }, [now, cfg.time])

      const setField = (key, value) => setCfg((prev) => ({ ...prev, [key]: value }))

      // ---- calendar cells (current month) ----
      const calCells = useMemo(() => {
        const y = now.getFullYear(), mo = now.getMonth()
        const first = new Date(y, mo, 1).getDay()
        const daysIn = new Date(y, mo + 1, 0).getDate()
        const cells = []
        for (let i = 0; i < first; i++) cells.push(null)
        for (let d = 1; d <= daysIn; d++) {
          const p = (n) => String(n).padStart(2, '0')
          cells.push({ day: d, key: y + '-' + p(mo + 1) + '-' + p(d) })
        }
        return cells
      }, [now])

      return h('div', { className: 'dshOff-root' },
        h('div', { className: 'dshOff-head' },
          h('div', null,
            h('div', { className: 'dshOff-title' }, t('title') + ' 🔔'),
            h('div', { className: 'dshOff-sub' }, t('subtitle'))
          )
        ),

        h('div', { className: 'dshOff-grid' },
          // left: clock + settings
          h('div', { className: 'dshOff-card' },
            h('div', { className: 'dshOff-cardTitle' }, t('clock')),
            h('div', { className: 'dshOff-clock' }, now.toLocaleTimeString()),
            h('div', { className: 'dshOff-count' }, t('countdown') + ' ', h('b', null, countdown)),
            h('div', { className: 'dshOff-row' },
              h('span', { className: 'dshOff-cb' }, t('time')),
              h('input', {
                className: 'dshOff-input', type: 'time', value: cfg.time,
                onChange: (e) => setField('time', e.target.value),
              })
            ),
            h('label', { className: 'dshOff-cb' },
              h('input', { type: 'checkbox', checked: cfg.enabled, onChange: (e) => setField('enabled', e.target.checked) }), t('enabled')
            ),
            h('label', { className: 'dshOff-cb' },
              h('input', { type: 'checkbox', checked: cfg.weekdaysOnly, onChange: (e) => setField('weekdaysOnly', e.target.checked) }), t('weekdaysOnly')
            ),
            h('div', { className: 'dshOff-cardTitle' }, t('messages')),
            h('div', { className: 'dshOff-note' }, t('messagesHint')),
            h('textarea', {
              className: 'dshOff-textarea', spellCheck: false,
              value: (cfg.messages || []).join('\n'),
              onChange: (e) => setField('messages', e.target.value.split('\n').filter((x) => x.trim())),
            }),
            h('div', { className: 'dshOff-row' },
              h('span', { className: 'dshOff-cb' }, t('interval')),
              h('input', {
                className: 'dshOff-input', type: 'number', min: 1, max: 60, style: { width: 70 },
                value: cfg.interval, onChange: (e) => setField('interval', Number(e.target.value) || 4),
              })
            ),
            h('div', { className: 'dshOff-row' },
              h('span', { className: 'dshOff-cb' }, t('animation')),
              h('select', { className: 'dshOff-select', value: cfg.animation, onChange: (e) => setField('animation', e.target.value) },
                h('option', { value: 'slide' }, t('animSlide')),
                h('option', { value: 'fade' }, t('animFade')),
                h('option', { value: 'typewriter' }, t('animType'))
              )
            ),
            h('div', { className: 'dshOff-row' },
              h('span', { className: 'dshOff-cb' }, t('level')),
              h('select', { className: 'dshOff-select', value: cfg.level, onChange: (e) => setField('level', e.target.value) },
                h('option', { value: 'banner' }, t('levelBanner')),
                h('option', { value: 'overlay' }, t('levelOverlay'))
              )
            ),
            h('div', { className: 'dshOff-row' },
              h('span', { className: 'dshOff-cb' }, t('sound')),
              h('select', { className: 'dshOff-select', value: cfg.sound, onChange: (e) => setField('sound', e.target.value) },
                h('option', { value: 'chime' }, t('sndChime')),
                h('option', { value: 'bell' }, t('sndBell')),
                h('option', { value: 'ding' }, t('sndDing')),
                h('option', { value: 'marimba' }, t('sndMarimba')),
                h('option', { value: 'beep' }, t('sndBeep')),
                h('option', { value: 'off' }, t('sndOff'))
              ),
              h('button', {
                type: 'button', className: 'dshOff-btn', disabled: cfg.sound === 'off',
                onClick: () => playChime(cfg.sound),
              }, t('soundTry'))
            ),
            h('div', { className: 'dshOff-row' },
              h('button', {
                type: 'button', className: 'dshOff-btn dshOff-btnPrimary',
                onClick: () => { writeJSON(CFG_KEY, cfg); setToast(t('saved')) },
              }, t('save')),
              h('button', {
                type: 'button', className: 'dshOff-btn',
                onClick: () => { setCfg(DEFAULT_CFG); writeJSON(CFG_KEY, DEFAULT_CFG); setToast(t('saved')) },
              }, t('reset')),
              h('button', { type: 'button', className: 'dshOff-btn', onClick: () => startReminder(true) }, t('test'))
            ),
            toast ? h('div', { className: 'dshOff-note' }, toast) : null
          ),

          // right: stats + calendar
          h('div', { className: 'dshOff-card' },
            h('div', { className: 'dshOff-cardTitle' }, t('calendar')),
            h('div', { className: 'dshOff-stats' },
              h('div', { className: 'dshOff-stat' }, h('b', null, String(stats.streak)), h('span', null, t('streak') + ' ' + t('days'))),
              h('div', { className: 'dshOff-stat' }, h('b', null, String(stats.monthCount)), h('span', null, t('thisMonth'))),
              h('div', { className: 'dshOff-stat' }, h('b', null, String(stats.total)), h('span', null, t('total')))
            ),
            h('div', { className: 'dshOff-cal' },
              [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')].map((d, i) => h('div', { key: i, className: 'dshOff-calHead' }, d))
            ),
            h('div', { className: 'dshOff-cal' },
              calCells.map((c, i) => c
                ? h('div', {
                    key: i,
                    className: 'dshOff-cell' + (checkins.includes(c.key) ? ' dshOff-cellOn' : '') + (c.key === todayKey() ? ' dshOff-cellToday' : ''),
                    title: c.key,
                  }, c.day)
                : h('div', { key: i })
              )
            ),
            checkins.length === 0 ? h('div', { className: 'dshOff-note' }, t('noCheckins')) : null,
            h('div', { className: 'dshOff-note' }, t('previewHint')),
            h('button', { type: 'button', className: 'dshOff-btn', onClick: () => startReminder(true) }, t('preview'))
          )
        ),

      )
    }

    // ---- reminder renderers ------------------------------------------------
    function confetti() {
      const wrap = document.createElement('div')
      wrap.className = 'dshOff-confetti'
      const colors = ['#ff9a3c', '#ff5e62', '#2ecc71', '#3498db', '#f1c40f', '#e91e63']
      for (let i = 0; i < 60; i++) {
        const b = document.createElement('i')
        b.className = 'dshOff-bit'
        b.style.left = Math.random() * 100 + '%'
        b.style.background = colors[i % colors.length]
        b.style.animationDuration = (2 + Math.random() * 2) + 's'
        b.style.animationDelay = (Math.random() * 0.6) + 's'
        wrap.appendChild(b)
      }
      document.body.appendChild(wrap)
      setTimeout(() => wrap.remove(), 4800)
    }

    // Robust DOM-level reminder: appended to document.body and animated with the
    // Web Animations API so it is never clipped by panel overflow/z-index and the
    // entrance animation always plays (no reliance on React re-render timing).
    let liveReminder = null
    function showReminderDOM(cfg, t, callbacks) {
      if (liveReminder) { try { liveReminder.cleanup() } catch (_) {} }
      const msgs = (cfg.messages && cfg.messages.length) ? cfg.messages : DEFAULT_MESSAGES
      const anim = cfg.animation || 'slide'
      const overlay = cfg.level === 'overlay'

      const root = document.createElement('div')
      root.className = 'dshOff-liveRoot'
      root.style.cssText = 'position:fixed;' + (overlay ? 'inset:0;background:rgba(20,12,8,.9);' : 'top:64px;right:24px;max-width:420px;') +
        'z-index:2147483000;display:flex;flex-direction:column;gap:12px;' +
        'align-items:' + (overlay ? 'center' : 'stretch') + ';justify-content:' + (overlay ? 'center' : 'flex-start') + ';'
      if (overlay) root.style.height = '100vh'

      const card = document.createElement('div')
      card.style.cssText = 'background:linear-gradient(135deg,#ff9a3c,#ff5e62);color:#fff;border-radius:14px;padding:' +
        (overlay ? '30px 40px' : '16px 20px') + ';box-shadow:0 12px 36px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px;' +
        (overlay ? 'min-width:340px;max-width:80vw;' : 'width:100%;')

      const head = document.createElement('div')
      head.textContent = '🔔 ' + (t('goOff') || 'Time to go home!')
      head.style.cssText = 'font-size:12px;font-weight:600;opacity:.9;'
      const msg = document.createElement('div')
      msg.style.cssText = 'font-size:' + (overlay ? '38px' : '17px') + ';font-weight:800;min-height:' + (overlay ? '56px' : '26px') + ';line-height:1.35;word-break:break-word;'
      card.appendChild(head); card.appendChild(msg)

      const btns = document.createElement('div')
      btns.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;'
      const mk = (label, primary, fn) => {
        const b = document.createElement('button')
        b.textContent = label
        b.style.cssText = 'border:' + (primary ? '0' : '1px solid rgba(255,255,255,.6)') + ';background:' + (primary ? '#fff' : 'rgba(255,255,255,.15)') + ';color:' + (primary ? '#ff5e62' : '#fff') + ';border-radius:8px;padding:8px 14px;font-size:12px;font-weight:' + (primary ? '700' : '500') + ';cursor:pointer;font-family:inherit;'
        b.onclick = fn
        btns.appendChild(b); return b
      }
      mk(t('checkin') || 'Clock out', true, () => { confetti(); callbacks.onCheckin(); cleanup() })
      mk(t('later') || 'Later', false, () => { callbacks.onLater(); cleanup() })
      if (!overlay) mk(t('dismiss') || 'Close', false, () => cleanup())
      card.appendChild(btns)
      root.appendChild(card)
      document.body.appendChild(root)

      // message rotation
      let idx = 0
      let typeTimer = null
      const showText = (text) => {
        if (anim !== 'typewriter') { msg.textContent = text; return }
        msg.textContent = ''
        let n = 0
        if (typeTimer) clearInterval(typeTimer)
        typeTimer = setInterval(() => {
          n += 1; msg.textContent = text.slice(0, n)
          if (n >= text.length) { clearInterval(typeTimer); typeTimer = null }
        }, 55)
      }
      showText(msgs[0])
      const rot = setInterval(() => { idx = (idx + 1) % msgs.length; showText(msgs[idx]) }, Math.max(1, cfg.interval) * 1000)

      // entrance animation via WAAPI (always plays)
      const frames = anim === 'slide'
        ? [{ transform: 'translateX(130%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }]
        : anim === 'fade'
          ? [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }]
          : [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }]
      const animOpts = { duration: anim === 'slide' ? 700 : 550, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }
      if (root.animate) root.animate(frames, animOpts)
      if (overlay && card.animate) card.animate(frames, { ...animOpts, duration: 800 })

      function cleanup() {
        try { clearInterval(rot) } catch (_) {}
        try { if (typeTimer) clearInterval(typeTimer) } catch (_) {}
        try { root.remove() } catch (_) {}
        if (liveReminder && liveReminder.cleanup === cleanup) liveReminder = null
      }
      liveReminder = { cleanup }
      return cleanup
    }

    // ---- sidebar icon ------------------------------------------------------
    function SidebarIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true,
        style: { opacity: props.active ? 1 : 0.82 },
      },
        h('path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z' }),
        h('path', { d: 'M10 21h4' }),
        h('path', { d: 'M13 3l3-2' })
      )
    }

    // ---- apply -------------------------------------------------------------
    function apply(ctx) {
      ctx.effect(() => installStyles(), NS + ': styles')
      if (ctx.locale !== undefined) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), NS + ': dictionaries')
        t = ctx.locale.bind(NS)
      }
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: PANEL_ID, order: 19, label: () => t('title'), locale: NS,
      }, SidebarIcon)), NS + ': sidebar entry')
      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: PANEL_ID, locale: NS,
      }, OffDutyPanel)), NS + ': panel')
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
