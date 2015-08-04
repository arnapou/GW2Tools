<?php

/*
 * This file is part of the Arnapou GW2Tools package.
 *
 * (c) Arnaud Buathier <arnaud@arnapou.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Arnapou\GW2Tools\Module;

use Arnapou\GW2Tools\ApiClient;
use Arnapou\GW2Tools\Exception\TokenException;
use Arnapou\GW2Tools\TokenVault;
use Arnapou\Toolbox\Functions\Directory;
use Arnapou\Toolbox\Http\ResponseJson;

class Api extends \Arnapou\GW2Tools\AbstractModule {

	protected $menu = [
		'account'	 => 'Account',
		'characters' => 'Characters',
		'stuff'		 => 'Stuff stats',
		'attributes' => 'Attributes',
	];

	public function configure() {
		parent::configure();

		$regexpToken = '[A-F0-9-]{70,80}';
		$regexpCode = '[A-Za-z0-9]{10}';
		$regexpMenu = implode('|', array_keys($this->menu));

		$this->addRoute('', [$this, 'routeHome']);
		$this->addRoute('token-check', [$this, 'routeTokenCheck']);
		$this->addRoute('{code}/', [$this, 'routeHomeToken'])->assert('code', $regexpCode);
		$this->addRoute('{code}/{menu}/', [$this, 'routeMenu'])->assert('code', $regexpCode)->assert('menu', $regexpMenu);
		$this->addRoute('{code}/{menu}/content.html', [$this, 'routeMenuContent'])->assert('code', $regexpCode)->assert('menu', $regexpMenu);
		$this->addRoute('{code}/character/{name}', [$this, 'routeCharacter'])->assert('code', $regexpCode);
		$this->addRoute('{code}/character/{name}.html', [$this, 'routeCharacterContent'])->assert('code', $regexpCode);
	}

	public function getMenu() {
		return $this->menu;
	}

	public function routeHome() {
		return $this->renderPage('home.twig');
	}

	public function routeHomeToken($code) {
		$this->apiClientFromCode($code);
		return $this->getService()->returnResponseRedirect('./account/');
	}

	public function routeCharacter($code, $name) {
		try {
			$apiClient = $this->apiClientFromCode($code);
			if ($apiClient) {
				$characters = $apiClient->getCharacters();
				$name = rawurldecode($name);
				if (isset($characters[$name])) {
					$context = [
						'apiclient'	 => $apiClient,
						'account'	 => $apiClient->v2_account(),
						'char'		 => $characters[$name],
					];
					return $this->renderPage('character/page.twig', $context);
				}
			}
		}
		catch (TokenException $e) {
			return $this->renderPage('home.twig', ['token_error' => $e->getMessage()]);
		}
	}

	public function routeCharacterContent($code, $name) {
		try {
			$apiClient = $this->apiClientFromCode($code);
			if ($apiClient) {
				$characters = $apiClient->getCharacters();
				$name = rawurldecode($name);
				if (isset($characters[$name])) {
					$context = [
						'apiclient'	 => $apiClient,
						'account'	 => $apiClient->v2_account(),
						'char'		 => $characters[$name],
					];
					return $this->renderPage('character/content.twig', $context);
				}
			}
		}
		catch (TokenException $e) {
			return $this->renderPage('token-error.twig', ['token_error' => $e->getMessage()]);
		}
	}

	public function routeMenu($code, $menu) {
		try {
			$apiClient = $this->apiClientFromCode($code);
			if ($apiClient) {
				$context = [
					'apiclient'	 => $apiClient,
					'account'	 => $apiClient->v2_account(),
					'menu'		 => $menu,
				];
				return $this->renderPage($menu . '/page.twig', $context);
			}
		}
		catch (TokenException $e) {
			return $this->renderPage('home.twig', ['token_error' => $e->getMessage()]);
		}
	}

	public function routeMenuContent($code, $menu) {
		try {
			$apiClient = $this->apiClientFromCode($code);
			if ($apiClient) {
				$context = [
					'apiclient'	 => $apiClient,
					'account'	 => $apiClient->v2_account(),
					'menu'		 => $menu,
				];
				return $this->renderPage($menu . '/content.twig', $context);
			}
		}
		catch (TokenException $e) {
			return $this->renderPage('token-error.twig', ['token_error' => $e->getMessage()]);
		}
	}

	public function routeTokenCheck() {
		$data = [];
		try {
			$token = $this->getService()->getRequest()->get('token');
			if (empty($token)) {
				throw new TokenException('No token was provided.');
			}
			$vault = TokenVault::getInstance();

			$apiClient = $this->apiClientFromToken($token); // if no error is raised, the token is valid
			
			if ($vault->exists($token)) {
				$code = $vault->get($token);
			}
			else {
				$code = $vault->newKey();
				$vault->set($code, $token);
			}

			$data['code'] = $code;
		}
		catch (TokenException $e) {
			$data['error'] = $e->getMessage();
		}
		return new ResponseJson($data);
	}

	/**
	 * 
	 * @return ApiClient
	 */
	protected function apiClientFromCode($code) {
		$vault = TokenVault::getInstance();
		if (!$vault->exists($code)) {
			return null;
		}
		return $this->apiClientFromToken($vault->get($code));
	}

	/**
	 * 
	 * @return ApiClient
	 */
	protected function apiClientFromToken($token) {
		$path = $this->getService()->getPathCache() . '/gw2api';
		Directory::createIfNotExists($path);

		$client = ApiClient::EN($path);
		$client->setAccessToken($token);
		return $client;
	}

}
