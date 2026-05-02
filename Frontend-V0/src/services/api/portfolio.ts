import * as dummy from '../dummyData';

export async function getPortfolio(): Promise<any> {
  return dummy.getPortfolio();
}

export async function getHoldings(): Promise<any> {
  return dummy.getHoldings();
}

export async function getPnL(): Promise<any> {
  return dummy.getPnL();
}

export async function resetPortfolio(): Promise<any> {
  return { status: 'reset' };
}
