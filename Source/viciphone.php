<?php

// Enable to enable the debug access log 
$debug_access_log = true;

function get_param($key) {
	$value = filter_input(INPUT_GET, $key, FILTER_UNSAFE_RAW);
	if ($value === null) {
		$value = filter_input(INPUT_POST, $key, FILTER_UNSAFE_RAW);
	}
	return $value ?? '';
}

function decode_base64_value($value) {
	if ($value === null || $value === '') {
		return '';
	}
	$decoded = base64_decode($value, true);
	if ($decoded === false) {
		return '';
	}
	return trim($decoded);
}

// GET / POST Options
// the phone login used as the auth_user
$phone_login = decode_base64_value(get_param('phone_login'));

// the phone registration password
$phone_pass = decode_base64_value(get_param('phone_pass'));

// the server IP to register to
$server_ip = decode_base64_value(get_param('server_ip'));

// the audio codecs to use ( currently not supported )
$codecs = decode_base64_value(get_param('codecs'));

// additional webphone options
$options = decode_base64_value(get_param('options'));

// Encryption check
// Get remote address
$referring_url = filter_var($_SERVER['HTTP_REFERER'] ?? 'https://phone.vicloudservices.co', FILTER_UNSAFE_RAW);
$ref_url_array = parse_url($referring_url);
if (!is_array($ref_url_array)) {
	$ref_url_array = [];
}

// Do not include 
// user / pass / port / get / post 
// data in the URL that is logged or displayed
$ref_scheme = $ref_url_array['scheme'] ?? '';
$ref_host = $ref_url_array['host'] ?? '';
$ref_path = $ref_url_array['path'] ?? '';
$base_referring_url = ($ref_scheme && $ref_host) ? $ref_scheme . '://' . $ref_host . $ref_path : $referring_url;

// Create the debug log string
$log_parts = [date("Y-m-d H:i:s")];
$log_parts[] = $_SERVER['REMOTE_ADDR'] ?? '';
$log_parts[] = $base_referring_url;
$log_parts[] = $_SERVER['HTTP_USER_AGENT'] ?? '';
$browser_info = get_browser(null, true);
if (is_array($browser_info)) {
	$log_parts[] = json_encode($browser_info);
} else {
	$log_parts[] = '';
}
$log_string = implode("\t", $log_parts) . "\n";

if ( $debug_access_log ) {
	// log it
	file_put_contents( "debug/viciphone_access.log", $log_string, FILE_APPEND | LOCK_EX );
}

// Encryption Check
// $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
// 	|| (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
// 	|| (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
// if ( ! $is_https ) {
// 	// Connection is not https
// 	// Throw and Alert and exit
// 	echo "<script language='javascript'>";
// 	echo "alert('Connection is not encrypted. VICIphone cannot load without encryption. Please make sure you are using the correct URL.')";
// 	echo "</script>";
// 	exit;
// }


// whether debug should be enabled
$debug_enabled = false;

// sip connection info
$cid_name = "$phone_login";
$sip_uri = "$phone_login@$server_ip";
$auth_user = "$phone_login";
$password = "$phone_pass";

// process options
$options_array = explode("--", $options);

// DEBUG options
if ( in_array( "DEBUG" , $options_array ) ) {
        $debug_enabled = true;
} else {
        // default to enabled
        $debug_enabled = false;
}

// display restriction options
// whether to disable the dialpad
if ( in_array( "DIALPAD_N" , $options_array ) ) {
	$hide_dialpad = true;
} else {
	// default to enabled
	$hide_dialpad = false;
}
// whether to disable the dial box
if ( in_array( "DIALBOX_N" , $options_array ) ) {
	$hide_dialbox = true;
} else {
	// default to enabled
	$hide_dialbox = false;
}
// whether to disable the mute button
if ( in_array( "MUTE_N" , $options_array ) ) {
	$hide_mute = true;
} else {
	// default to enabled
	$hide_mute = false;
}
// whether to disable the volume buttons
if ( in_array( "VOLUME_N" , $options_array ) ) {
	$hide_volume = true;
} else {
	// default to enabled
	$hide_volume = false;
}

// behavior options
// whether to enable auto answer
if ( in_array( "AUTOANSWER_Y" , $options_array ) ) {
	$auto_answer = true;
} else {
	$auto_answer = false;
}

// WEBSOCKET url
$ws_server = '';
foreach( $options_array as $value ) {
	if ( strpos( $value, 'WEBSOCKETURL' ) !== false ) {
		$ws_server = $value;
		$ws_server = str_replace( 'WEBSOCKETURL', '', $ws_server );
	}
}
$ws_server = filter_var($ws_server, FILTER_SANITIZE_URL);

// Layout file handling
$layout = '';
foreach( $options_array as $value ) {
        if ( strpos( $value, 'WEBPHONELAYOUT' ) !== false ) {
                $layout = $value;
                $layout = str_replace( 'WEBPHONELAYOUT', '', $layout );
        }
}
if ( $layout == '' ) {
	# layout is blank use the default
	$layout = 'css/default.css';
} elseif ( preg_match('#^https?://#i', $layout) === 1 ) {
	# layout begins with http:// or https:// so it is a link
	# do nothing
} elseif ( preg_match('#^css/#i', $layout) === 1 ) {
	# layout begins with css/ 
	if ( preg_match('#\.css$#i', $layout) === 1 ) {
		# layout ends in .css
		# do nothing
	} else {
		# append .css to the layout
		$layout .= ".css";
	}
} elseif ( preg_match('#\.css$#i', $layout) === 1 ) {
	# layout ends in .css
	$layout = "css/" . $layout;
} else {
	$layout = "css/" . $layout . ".css";
}
# sanitize the layout to try to prevent XSS
$layout = filter_var($layout, FILTER_SANITIZE_URL );
$layout = str_replace(array("\r", "\n"), '', $layout);

// call the template
require_once('vp_template.php');
?>
