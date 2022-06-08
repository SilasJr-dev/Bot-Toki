const CFonts = require('cfonts');



const banner = CFonts.say('Tomioka Bot', {
	font: 'block',                // definir a face da fonte
	align: 'left',                // definir o alinhamento do texto
	colors: ['blue','red'],       // definir todas as cores
	background: 'transparent',    // definir a cor de fundo, você também pode usar `backgroundColor` aqui como chave
	letterSpacing: 1,             // definir espaçamento entre letras
	lineHeight: '0,2',            // definir a altura da linha
	space: true,                  // define se o texto de saída deve ter linhas vazias na parte superior e na parte inferior
	maxLength: '0',               // defina quantos caracteres podem estar em uma linha
	gradient: ['red','blue'],     // defina suas duas cores gradientes
	independentGradient: true,    // defina se deseja recalcular o gradiente para cada nova linha
	transitionGradient: false,    // defina se esta é uma transição entre cores diretamente
	env: 'node'                   // definir o ambiente em que as CFonts estão sendo executadas
});







module.exports = {
    banner
}