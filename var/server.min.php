<?php
$angleUnit = 'rad';
function get($name, $default = NULL) {
    return $_GET[$name] ?? $default;
}
function post($name, $default = NULL) {
    return $_POST[$name] ?? $default;
}
function respond($data = NULL, $statusCode = 200) {
    http_response_code($statusCode);
    if (!is_null($data)) {
        die(json_encode($data));
    }
    die();
}
function setAngleUnit($unit) {
    global $angleUnit;
    $angleUnit = $unit;
}
function getEquation($name) {
    return query('SELECT * FROM equation WHERE name = :name', ['name' => $name])[0] ?? NULL;
}
function getEquationsFromCurrentUser() {
    return !empty($_COOKIE['user_id']) ? query('SELECT * FROM equation WHERE user_id = :user_id', ['user_id' => $_COOKIE['user_id']]) : [];
}
try {
    $connection = new PDO("mysql:host=localhost;dbname=webt", "root", "root");
} catch (PDOException $e) {
    respond([
        'error' => 'Database connection failed'
    ], 500);
}
function query($sql, $params = NULL) {
    global $connection;
    $stmt = $connection->prepare($sql);
    try {
        $stmt->execute($params);
    } catch (PDOException $e) {
        return FALSE;
    }
    if (str_starts_with(strtoupper($sql), 'SELECT')) {
        return $stmt->fetchAll();
    }
}
$validationRules = [
    'required' => [
        'validator' => fn ($value) => !empty($value),
        'message' => 'The field {label} is required!'
    ],
    'hex_code' => [
        'validator' => fn ($value) => preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/', $value) > 0,
        'message' => '{label} is not a valid hexcode.'
    ],
    'deg_or_rad' => [
        'validator' => fn ($value) => in_array($value, ['rad', 'deg']),
        'message' => '{label} can only be deg or rad.'
    ],
    'equation' => [
        'validator' => fn ($value) => preg_match('/^(?:[x \(\)\*+-\/0-9]|sin|cos|tan|sqrt|%pi|%e)*$/', $value) > 0,
        'message' => '{label} is not a valid equation.'
    ]
];
function validate($data, $fields, $dieOnError = FALSE) {
    global $validationRules;
    $errors = [];
    foreach ($fields as $name => $options) {
        $value = $data[$name] ?? NULL;
        foreach ($options['rules'] as $rule) {
            $validationRule = $validationRules[$rule];
            if (!$validationRule['validator']($value)) {
                if (empty($errors[$name])) {
                    $errors[$name] = [str_replace('{label}', $options['label'], $validationRule['message'])];
                } else {
                    $errors[$name][] = str_replace('{label}', $options['label'], $validationRule['message']);
                }
            }
        }
    }
    if ($dieOnError && !empty($errors)) {
        respond(['errors' => $errors], 400);
    }
    return !empty($errors) ? $errors : TRUE;
}
$actions = [
    'save_color' => function () {
        validate($_POST, [
            'color' => [
                'rules' => ['required', 'hex_code'],
                'label' => 'Color'
            ]
        ]);
        setcookie('color', post('color'), strtotime('+1 year'));
        respond(['success' => TRUE]);
    },
    'get_color' => function () {
        $color = $_COOKIE['color'] ?? '#a534da';
        respond(['data' => ['color' => $color]]);
    },
    'get_equations' => fn () => respond(['data' => ['equations' => getEquationsFromCurrentUser()]]),
    'get_equation' => function () {
        validate($_GET, [
            'name' => [
                'rules' => ['required']
            ]
        ], TRUE);
        $equation = query('SELECT * FROM equation WHERE name = :name', ['name' => get('name')])[0] ?? NULL;
        if (empty($equation)) respond(['error' => 'Not found'], 404);
        respond([
            'data' => [
                'equation' => $equation,
                'plot' => executeEquation($equation['equation'], $equation['angle_unit'])
            ]
        ]);
    },
    'execute_equation' => function () {
        $angleUnit = post('angle_unit');
        $persist = post('persist', FALSE);
        $name = post('name');
        $equation = post('equation');
        $rules = [
            'angle_unit' => [
                'rules' => ['required', 'deg_or_rad'],
                'label' => 'Angle unit'
            ],
            'equation' => [
                'rules' => ['required', 'equation'],
                'label' => 'Equation'
            ]
        ];
        if ($persist) {
            $rules['name'] = [
                'rules' => ['required'],
                'label' => 'Name'
            ];
        }
        validate($_POST, $rules, TRUE);
        $plot = executeEquation($equation, $angleUnit);
        if (!$plot) respond(['errors' => ['equation' => ['Your equations as an invalid syntax']]], 400);
        if ($persist) {
            $_COOKIE['user_id'] = $_COOKIE['user_id'] ?? uniqid('', TRUE);
            setcookie('user_id', $_COOKIE['user_id'], strtotime('+1 year'));
            query('REPLACE INTO `equation` (`name`, `user_id`, `angle_unit`, `equation`) VALUES (:name, :user_id, :angle_unit, :equation)', [
                'user_id' => $_COOKIE['user_id'],
                'name' => $name,
                'angle_unit' => $angleUnit,
                'equation' => $equation
            ]);
        }
        respond(['data' => ['plot' => $plot, 'equations' => getEquationsFromCurrentUser()]]);
    },
];
function e_sin($value) {
    global $angleUnit;
    return $angleUnit == 'rad' ? sin($value) : sin(deg2rad($value));
}
function e_cos($value) {
    global $angleUnit;
    return $angleUnit == 'rad' ? cos($value) : cos(deg2rad($value));
}
function e_tan($value) {
    global $angleUnit;
    return $angleUnit == 'rad' ? tan($value) : tan(deg2rad($value));
}
function executeEquation($equation, $angleUnit = 'rad', $from = -20, $to = 20, $stepSize = 0.05) {
    setAngleUnit($angleUnit);
    $equation = str_replace(['x', '%pi', '%e', 'sin', 'cos', 'tan'], ['$x', 'M_PI', 'M_E', 'e_sin', 'e_cos', 'e_tan'], $equation);
    try {
        $fn = eval('return function ($x) {
                                try {
                                    return ' . $equation . ';
                                } catch (DivisionByZeroError $e) {
                                    return NULL;
                                }
                            };');
    } catch (ParseError $e) {
        return FALSE;
    }
    $plot = [];
    for ($x = $from; $x <= $to; $x += $stepSize) {
        $y = $fn($x);
        if (is_nan($y)) $y = NULL;
        $plot[] = [
            'x' => $x,
            'y' => $y
        ];
    }
    return $plot;
}
$action = get('action', post('action'));
if (!array_key_exists($action, $actions)) {
    respond(['error' => 'Requested resource not found'], 404);
}
$actions[$action]();