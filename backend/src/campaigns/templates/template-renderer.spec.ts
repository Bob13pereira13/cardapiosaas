import { renderTemplate, extractVariables } from './template-renderer';

describe('renderTemplate', () => {
  it('A. substituição simples', () => {
    expect(renderTemplate('Olá {nome}', { nome: 'João' })).toBe('Olá João');
  });

  it('B. múltiplas variáveis', () => {
    expect(
      renderTemplate('Olá {nome}, use cupom {cupom}', {
        nome: 'Maria',
        cupom: 'ABC',
      }),
    ).toBe('Olá Maria, use cupom ABC');
  });

  it('C. variável não fornecida é preservada literalmente', () => {
    expect(renderTemplate('Olá {nome}, ganhe {cupom}', { nome: 'X' })).toBe(
      'Olá X, ganhe {cupom}',
    );
  });

  it('D. variável repetida substituída em todas as ocorrências', () => {
    expect(renderTemplate('Bem-vinda {nome}, {nome}!', { nome: 'Ana' })).toBe(
      'Bem-vinda Ana, Ana!',
    );
  });

  it('E. template sem variáveis retorna inalterado', () => {
    expect(renderTemplate('mensagem fixa', {})).toBe('mensagem fixa');
  });

  it('F. template vazio retorna vazio', () => {
    expect(renderTemplate('', {})).toBe('');
  });

  it('G. vars vazio preserva todas as variáveis', () => {
    expect(renderTemplate('Olá {nome}', {})).toBe('Olá {nome}');
  });

  it('H. variável com valor null é preservada literalmente', () => {
    expect(renderTemplate('Olá {nome}', { nome: null })).toBe('Olá {nome}');
  });

  it('I. variável com string vazia substitui com vazio', () => {
    expect(renderTemplate('Olá {nome}', { nome: '' })).toBe('Olá ');
  });
});

describe('extractVariables', () => {
  it('J. extrai variáveis distintas do template', () => {
    expect(extractVariables('Olá {nome} {cupom}')).toEqual(['nome', 'cupom']);
  });

  it('K. deduplicação — variável repetida aparece uma vez', () => {
    expect(extractVariables('Oi {nome} {nome}')).toEqual(['nome']);
  });

  it('L. template sem variáveis retorna array vazio', () => {
    expect(extractVariables('mensagem fixa')).toEqual([]);
  });

  it('M. primeiroNome funciona se passado como vars (responsabilidade do caller)', () => {
    expect(renderTemplate('Oi {primeiroNome}!', { primeiroNome: 'João' })).toBe(
      'Oi João!',
    );
  });
});
