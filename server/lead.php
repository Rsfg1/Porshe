<?php
// Drive Travel: заявка с посадочной страницы -> amoCRM (сделка + контакт + UTM + примечание).
// Ничего не хранит: имена и телефоны не пишутся ни в файлы, ни в журнал.
// Настройки — вне папки сайта: ~/private/dt_amo.php (chmod 600), возвращает массив:
//   ['domain' => 'drivetravel.amocrm.ru', 'token' => '...', 'pipeline' => 0, 'status' => 0, 'tag' => 'сайт-туры']
// Ограничение частоты: хеши IP (с солью) + время, файл вне папки сайта, хранится 10 минут.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function out($code, $ok) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }
function clean($s, $n = 200) { return mb_substr(trim(preg_replace('/\s+/u', ' ', (string)$s)), 0, $n); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, false);

$home = dirname(__DIR__, 2);                       // /var/www/uXXXX/data
$cfg = require $home . '/private/dt_amo.php';
$TOURS = ['altai' => 'Алтай', 'anapa' => 'Анапа', 'arctic' => 'Арктика', 'baikal' => 'Байкал',
          'dagestan' => 'Дагестан', 'sakhalin' => 'Сахалин', 'solovki' => 'Соловки',
          'zaonezhie' => 'Заонежье', 'zaonezhie-price' => 'Заонежье'];
$UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

// только со своего сайта
$host = $_SERVER['HTTP_HOST'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) out(403, false);

// не больше 5 заявок за 10 минут с одного адреса
$ip = $_SERVER['REMOTE_ADDR'] ?? '';                // X-Real-IP не берём: клиент может подставить любой
$key = hash('sha256', $ip . '|' . $cfg['token']);
$rlFile = $home . '/private/dt_rl.json';
$fp = fopen($rlFile, 'c+');
if ($fp) {
    flock($fp, LOCK_EX);
    $rl = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
    $now = time();
    foreach ($rl as $k => $ts) { $rl[$k] = array_values(array_filter($ts, fn($t) => $now - $t < 600)); if (!$rl[$k]) unset($rl[$k]); }
    $rl[$key][] = $now;
    $tooMany = count($rl[$key]) > 5;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($rl)); flock($fp, LOCK_UN); fclose($fp);
    if ($tooMany) out(429, false);
}

$raw = file_get_contents('php://input', false, null, 0, 8193);
if (strlen($raw) > 8192) out(413, false);
$d = json_decode($raw, true);
if (!is_array($d)) out(400, false);
if (!empty($d['website'])) out(200, true);          // ловушка для ботов

$digits = preg_replace('/\D/', '', (string)($d['phone'] ?? ''));
$name = clean($d['name'] ?? '', 80);
if ($name === '' || strlen($digits) < 10 || strlen($digits) > 11 || ($d['consent'] ?? null) !== true) out(422, false);
if (strlen($digits) === 10) $digits = '7' . $digits;
if (strlen($digits) === 11 && $digits[0] === '8') $digits = '7' . substr($digits, 1);
$phone = '+' . $digits;

$tour = clean($d['tour'] ?? '', 60);
$tourName = $TOURS[$tour] ?? $tour;
$utmIn = is_array($d['utm'] ?? null) ? $d['utm'] : [];
$utm = [];
foreach ($UTM_KEYS as $k) if (!empty($utmIn[$k])) $utm[$k] = clean($utmIn[$k], 250);
$src = $utm['utm_source'] ?? 'без метки';

function amo($cfg, $method, $path, $body = null) {
    $c = curl_init('https://' . $cfg['domain'] . $path);
    curl_setopt_array($c, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['token'], 'Content-Type: application/json']]);
    if ($body !== null) curl_setopt($c, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    $res = curl_exec($c);
    $code = curl_getinfo($c, CURLINFO_HTTP_CODE);
    return [$code, $res ? json_decode($res, true) : null];
}

$lead = [
    'name' => "Сайт: $tourName ($src)",
    '_embedded' => [
        'tags' => [['name' => $cfg['tag'] ?? 'сайт-туры'], ['name' => 'тур: ' . $tourName]],
        'contacts' => [['first_name' => $name, 'custom_fields_values' => [
            ['field_code' => 'PHONE', 'values' => [['value' => $phone, 'enum_code' => 'MOB']]]]]],
    ],
];
if (!empty($cfg['pipeline'])) $lead['pipeline_id'] = (int)$cfg['pipeline'];
if (!empty($cfg['status'])) $lead['status_id'] = (int)$cfg['status'];
$cf = [];
foreach ($utm as $k => $v) if (strpos($k, 'utm_') === 0) $cf[] = ['field_code' => strtoupper($k), 'values' => [['value' => $v]]];
if (!empty($utm['yclid'])) $cf[] = ['field_code' => 'YCLID', 'values' => [['value' => $utm['yclid']]]];
if (!empty($utm['gclid'])) $cf[] = ['field_code' => 'GCLID', 'values' => [['value' => $utm['gclid']]]];
if ($cf) $lead['custom_fields_values'] = $cf;

[$code, $res] = amo($cfg, 'POST', '/api/v4/leads/complex', [$lead]);
if ($code === 400 && $cf) {                          // поле UTM не найдено в аккаунте — без него, UTM уйдут в примечание
    unset($lead['custom_fields_values']);
    [$code, $res] = amo($cfg, 'POST', '/api/v4/leads/complex', [$lead]);
}
if ($code < 200 || $code >= 300 || empty($res[0]['id'])) { error_log("dt-lead amo error $code"); out(502, false); }
$leadId = $res[0]['id'];

$lines = ["Заявка с сайта (посадочная страница тура «{$tourName}»)",
    'Дата заезда: ' . (clean($d['departure'] ?? '', 80) ?: 'не выбрана'),
    'Кто едет: ' . (clean($d['crew'] ?? '', 80) ?: 'не указано'),
    'Где удобнее связаться: ' . (clean($d['channel'] ?? '', 40) ?: 'не указано'),
    'Страница: ' . clean($d['page'] ?? '', 400)];
$lines[] = $utm ? 'UTM: ' . implode(', ', array_map(fn($k, $v) => "$k=$v", array_keys($utm), $utm))
                : 'UTM: нет (прямой заход или органика)';
[$nc] = amo($cfg, 'POST', "/api/v4/leads/$leadId/notes", [['note_type' => 'common', 'params' => ['text' => implode("\n", $lines)]]]);
if ($nc < 200 || $nc >= 300) error_log("dt-lead note failed $leadId $nc");

out(200, true);
