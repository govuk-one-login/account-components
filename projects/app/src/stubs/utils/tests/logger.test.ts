import logger from '../logger.js';
import {expect, describe, it} from "vitest";

describe("placeholder", () => {
  it("test placeholder", async () => {
    expect("abc").to.eq("abc");
  });
});

// describe('logger', () => {
//   it('exports logger', () => {
//     const infoSpy = jest.spyOn(logger, 'info');
//     logger.info('test');
//     expect(infoSpy).toHaveBeenCalledWith('test');
//     expect(infoSpy).toHaveBeenCalledTimes(1);
//   });
// });
