<?php
  $DELAY_MAP = [
    '127.0.0.1:8080' => 1000 + rand(-200, 200),
    '127.0.0.1:30001' => 500 + rand(-100, 100),
    '127.0.0.1:30002' => 300 + rand(-100, 100),
  ];
  $host = $_SERVER['HTTP_HOST'];
  $delay = $DELAY_MAP[$host];
  usleep($delay * 1000);

  header('Access-Control-Allow-Origin: *');
?>
<!doctype html>
<html>
<head>
  <!-- <script src="/freecdn-loader.min.js"></script> -->
  <title>Post Proxy</title>
  <meta charset="utf-8">
  <style>
    table {
      border-collapse: collapse;
      margin: 1em;
    }
    table td {
      border: 1px solid #000;
      padding: .2em .5em;
    }
  </style>
</head>
<body>
  <table>
    <tr>
      <td>Time</td>
      <td>Data</td>
    </tr>
<?php
  function getPostRecord() {
    $data = $_POST['data'];
    $nonce = $_POST['nonce'];

    if (!is_string($data) || $data === '' || strlen($data) > 200) {
      return;
    }
    if (!is_string($nonce) || strlen($nonce) !== 64) {
      return;
    }
    return [
      'time' => date('Y-m-d h:i:s'),
      'data' => $data,
      'nonce' => $nonce,
    ];
  }

  function hasReplay($records, $nonce) {
    foreach ($records as $item) {
      if ($item['nonce'] === $nonce) {
        return true;
      }
    }
    return false;
  }

  function main() {
    $db = '../data/db.json';
    $records = json_decode(file_get_contents($db), true);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
      $r = getPostRecord();
      if ($r && !hasReplay($records, $r['nonce'])) {
        array_push($records, $r);
        file_put_contents($db, json_encode($records, JSON_PRETTY_PRINT));
      }
    }

    foreach ($records as $item) {
      $data = htmlspecialchars($item['data']);
      $time = $item['time'];
      echo("
    <tr>
      <td>$time</td>
      <td>$data</td>
    </tr>
");
    }
  }
  main();
?>
  </table>
  <form method="POST">
    Data: <input type="text" name="data" maxlength="20" autofocus>
    <input type="hidden" name="nonce" value="<?php echo(bin2hex(random_bytes(32))) ?>">
    <button type="submit">Submit</button>
  </form>
  <hr>
  <?php
    echo("via $host (delay: ${delay}ms)");
  ?>
</body>
</html>