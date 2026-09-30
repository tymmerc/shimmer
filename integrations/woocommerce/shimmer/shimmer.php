<?php
/**
 * Plugin Name:       Shimmer
 * Plugin URI:        https://tymmerc.eu/shimmer/
 * Description:       Vendeur IA dans la barre de recherche, suivi de commande dans le chat et mesure honnête de ce que Shimmer rapporte.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            Shimmer
 * License:           GPL-2.0-or-later
 * Text Domain:       shimmer
 */

if (!defined('ABSPATH')) {
	exit;
}

const SHIMMER_DEFAULT_API = 'https://tymmerc.eu/shimmer';

/*
 * Compatibilité déclarée : commandes en tables dédiées (HPOS) et tunnel de
 * commande en blocs.
 */
add_action('before_woocommerce_init', function () {
	if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
	}
});

/* ───────────────────────── Réglages ───────────────────────── */

function shimmer_sanitize_key($value) {
	$value = trim((string) $value);
	// Clé PUBLIQUE seulement (pk_…). Une clé secrète (sk_…) ne doit jamais
	// finir dans le code des pages de la boutique.
	return preg_match('/^pk_[A-Za-z0-9_-]{20,80}$/', $value) ? $value : '';
}

function shimmer_sanitize_api($value) {
	$value = esc_url_raw(trim((string) $value));
	return (strpos($value, 'https://') === 0) ? untrailingslashit($value) : SHIMMER_DEFAULT_API;
}

add_action('admin_init', function () {
	register_setting('shimmer', 'shimmer_store_id', array('type' => 'integer', 'sanitize_callback' => 'absint'));
	register_setting('shimmer', 'shimmer_publishable_key', array('type' => 'string', 'sanitize_callback' => 'shimmer_sanitize_key'));
	register_setting('shimmer', 'shimmer_api_url', array('type' => 'string', 'sanitize_callback' => 'shimmer_sanitize_api', 'default' => SHIMMER_DEFAULT_API));
	register_setting('shimmer', 'shimmer_search_selector', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field'));
});

add_action('admin_menu', function () {
	add_options_page('Shimmer', 'Shimmer', 'manage_options', 'shimmer', 'shimmer_settings_page');
});

function shimmer_settings_page() {
	if (!current_user_can('manage_options')) {
		return;
	}
	$store = (int) get_option('shimmer_store_id');
	$api   = get_option('shimmer_api_url', SHIMMER_DEFAULT_API);
	$hooks = array(
		'Commande créée'      => 'order_created',
		'Commande mise à jour' => 'order_updated',
		'Produit créé'        => 'product_created',
		'Produit mis à jour'  => 'product_updated',
		'Produit supprimé'    => 'product_deleted',
	);
	?>
	<div class="wrap">
		<h1>Shimmer</h1>
		<p>Le numéro de boutique et la clé publique (pk_…) sont dans l'admin Shimmer, section Intégration.</p>
		<form method="post" action="options.php">
			<?php settings_fields('shimmer'); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="shimmer_store_id">Numéro de boutique</label></th>
					<td><input name="shimmer_store_id" id="shimmer_store_id" type="number" min="1" value="<?php echo esc_attr($store ?: ''); ?>" class="small-text"></td>
				</tr>
				<tr>
					<th scope="row"><label for="shimmer_publishable_key">Clé publique</label></th>
					<td><input name="shimmer_publishable_key" id="shimmer_publishable_key" type="text" value="<?php echo esc_attr(get_option('shimmer_publishable_key', '')); ?>" class="regular-text" placeholder="pk_…" autocomplete="off"></td>
				</tr>
				<tr>
					<th scope="row"><label for="shimmer_search_selector">Barre de recherche (optionnel)</label></th>
					<td><input name="shimmer_search_selector" id="shimmer_search_selector" type="text" value="<?php echo esc_attr(get_option('shimmer_search_selector', '')); ?>" class="regular-text" placeholder="input[type=search]">
						<p class="description">Sélecteur CSS de votre barre de recherche, si le thème en a une particulière.</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="shimmer_api_url">Adresse de l'API</label></th>
					<td><input name="shimmer_api_url" id="shimmer_api_url" type="url" value="<?php echo esc_attr($api); ?>" class="regular-text"></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php if ($store) : ?>
			<h2>Webhooks à créer</h2>
			<p>WooCommerce → Réglages → Avancé → Webhooks. Version d'API « WP REST API Intégration v3 », avec le secret indiqué dans l'admin Shimmer.</p>
			<table class="widefat striped" style="max-width:60rem">
				<thead><tr><th>Sujet</th><th>URL de livraison</th></tr></thead>
				<tbody>
				<?php foreach ($hooks as $label => $path) : ?>
					<tr><td><?php echo esc_html($label); ?></td><td><code><?php echo esc_html($api . '/api/webhooks/woocommerce/' . $path . '?store=' . $store); ?></code></td></tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</div>
	<?php
}

/* ───────────────────────── Widget ───────────────────────── */

add_action('wp_footer', function () {
	$store = (int) get_option('shimmer_store_id');
	$key   = (string) get_option('shimmer_publishable_key', '');
	if (!$store || $key === '' || is_admin()) {
		return;
	}
	$api      = get_option('shimmer_api_url', SHIMMER_DEFAULT_API);
	$selector = (string) get_option('shimmer_search_selector', '');
	printf(
		'<script src="%1$s" data-shimmer data-store="%2$d" data-key="%3$s" data-api="%4$s"%5$s defer></script>' . "\n",
		esc_url($api . '/sdk/shimmer.iife.js'),
		$store,
		esc_attr($key),
		esc_url($api),
		$selector !== '' ? ' data-search="' . esc_attr($selector) . '"' : ''
	);
});

/* ─────────────── Mesure : identifiant visiteur sur la commande ─────────────── */

/*
 * Le widget pose le cookie shimmer_vid seulement avec le consentement du
 * visiteur. On le recopie sur la commande (clé sans « _ » pour qu'elle
 * voyage dans le webhook) : Shimmer relie ainsi la vente au vendeur et au
 * groupe témoin de la mesure.
 */
function shimmer_visitor_id() {
	if (!isset($_COOKIE['shimmer_vid'])) {
		return '';
	}
	$value = sanitize_text_field(wp_unslash($_COOKIE['shimmer_vid']));
	return preg_match('/^[A-Za-z0-9_-]{4,80}$/', $value) ? $value : '';
}

function shimmer_tag_order($order) {
	$vid = shimmer_visitor_id();
	if ($vid !== '' && is_a($order, 'WC_Order')) {
		$order->update_meta_data('shimmer_vid', $vid);
	}
}

// Tunnel de commande classique.
add_action('woocommerce_checkout_create_order', 'shimmer_tag_order', 10, 1);
// Tunnel de commande en blocs.
add_action('woocommerce_store_api_checkout_update_order_from_request', 'shimmer_tag_order', 10, 1);
