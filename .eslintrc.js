module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'airbnb-typescript',
	],
	rules: {
		'@typescript-eslint/indent': ['error', 'tab'],
		'no-tabs': 0,
		'no-console': 'off',
	},
};
