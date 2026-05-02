import * as dummy from '../dummyData';

export async function getTrades(): Promise<any> {
  return dummy.getTrades();
}

export async function getPublicTrades(): Promise<any> {
  return dummy.getPublicTrades();
}
