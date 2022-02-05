import { GregorianDate } from "../../Source/Cesium.js";

describe("Core/GregorianDate", function () {
  describe("Positive scenarios", function () {
    it("Constructs any valid date", function () {
      const validDate = new GregorianDate(2022, 2, 4, 23, 54, 0, 999.9, false);
      expect(validDate.year).toEqual(2022);
      expect(validDate.month).toEqual(2);
      expect(validDate.day).toEqual(4);
      expect(validDate.hour).toEqual(23);
      expect(validDate.minute).toEqual(54);
      expect(validDate.second).toEqual(0);
      expect(validDate.millisecond).toEqual(999.9);
      expect(validDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs valid leap year date", function () {
      const validDate = new GregorianDate(2024, 2, 29, 23, 54, 0, 999.9, false);
      expect(validDate.year).toEqual(2024);
      expect(validDate.month).toEqual(2);
      expect(validDate.day).toEqual(29);
      expect(validDate.hour).toEqual(23);
      expect(validDate.minute).toEqual(54);
      expect(validDate.second).toEqual(0);
      expect(validDate.millisecond).toEqual(999.9);
      expect(validDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum date when no parameters are passed", function () {
      const minimumDate = new GregorianDate();
      expect(minimumDate.year).toEqual(1);
      expect(minimumDate.month).toEqual(1);
      expect(minimumDate.day).toEqual(1);
      expect(minimumDate.hour).toEqual(0);
      expect(minimumDate.minute).toEqual(0);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs valid dates for edge cases of days", function () {
      expect(function () {
        return new GregorianDate(2022, 1, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 3, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 4, 30);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 5, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 6, 30);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 7, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 8, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 9, 30);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 10, 31);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 30);
      }).not.toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 12, 31);
      }).not.toThrowDeveloperError();
    });

    it("Constructs the minimum possible date of the year when only year parameter is passed", function () {
      const minimumDate = new GregorianDate(2022);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(1);
      expect(minimumDate.day).toEqual(1);
      expect(minimumDate.hour).toEqual(0);
      expect(minimumDate.minute).toEqual(0);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum possible day of the month when only year and month parameters are passed", function () {
      const minimumDate = new GregorianDate(2022, 2);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(1);
      expect(minimumDate.hour).toEqual(0);
      expect(minimumDate.minute).toEqual(0);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum possible time of the day when only year, month and day parameters are passed", function () {
      const minimumDate = new GregorianDate(2022, 2, 28);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(28);
      expect(minimumDate.hour).toEqual(0);
      expect(minimumDate.minute).toEqual(0);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum possible time of the day when only year, month, day and hour parameters are passed", function () {
      const minimumDate = new GregorianDate(2022, 2, 28, 10);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(28);
      expect(minimumDate.hour).toEqual(10);
      expect(minimumDate.minute).toEqual(0);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum possible time of the day when only year, month, day, hour and minutes parameters are passed", function () {
      const minimumDate = new GregorianDate(2022, 2, 28, 10, 59);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(28);
      expect(minimumDate.hour).toEqual(10);
      expect(minimumDate.minute).toEqual(59);
      expect(minimumDate.second).toEqual(0);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the minimum possible time of the day when only year, month, day, hour, minutes and seconds parameters are passed", function () {
      const minimumDate = new GregorianDate(2022, 2, 28, 10, 59, 59);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(28);
      expect(minimumDate.hour).toEqual(10);
      expect(minimumDate.minute).toEqual(59);
      expect(minimumDate.second).toEqual(59);
      expect(minimumDate.millisecond).toEqual(0);
      expect(minimumDate.isLeapSecond).toBeFalsy();
    });

    it("Constructs the date with leap second", function () {
      const minimumDate = new GregorianDate(2022, 2, 28, 10, 59, 60, 100, true);
      expect(minimumDate.year).toEqual(2022);
      expect(minimumDate.month).toEqual(2);
      expect(minimumDate.day).toEqual(28);
      expect(minimumDate.hour).toEqual(10);
      expect(minimumDate.minute).toEqual(59);
      expect(minimumDate.second).toEqual(60);
      expect(minimumDate.millisecond).toEqual(100);
      expect(minimumDate.isLeapSecond).toBeTruthy();
    });
  });
  describe("Negative scenarios", function () {
    it("Should throw error if invalid year is passed", function () {
      expect(function () {
        return new GregorianDate(-1, 2, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(0, 2, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(10000, 2, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid month is passed", function () {
      expect(function () {
        return new GregorianDate(2022, -1, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 0, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 13, 4, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid day is passed", function () {
      expect(function () {
        return new GregorianDate(2022, 12, -10, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 12, 0, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 12, 32, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2020, 2, 30, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 29, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 31, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 4, 31, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 6, 31, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 9, 31, 23, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid hours is passed", function () {
      expect(function () {
        return new GregorianDate(2022, 2, 4, -10, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, -1, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 24, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 4, 100, 54, 0, 999.9, false);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid minute is passed", function () {
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, -1, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 60, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 7, 60, 0, 999.9, true);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 4, 0, -1, 0, 999.9, true);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid second is passed", function () {
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 1, -1, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 59, 60, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 7, 59, 61, 999.9, true);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 4, 0, 1, -1, 999.9, true);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid millisecond is passed", function () {
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 1, 0, -1, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 59, 59, 1000, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 7, 59, 60, 1000, true);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 11, 4, 0, 1, 0, -12, true);
      }).toThrowDeveloperError();
    });

    it("Should throw error if invalid type is passed", function () {
      expect(function () {
        return new GregorianDate("2022A", 2, 4, 15, 1, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, "Two", 4, 15, 1, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, "F0UR", 15, 1, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, "15th", 1, 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, "1st", 0, 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 1, "Zero", 999.9, false);
      }).toThrowDeveloperError();
      expect(function () {
        return new GregorianDate(2022, 2, 4, 15, 1, 0, "999,9O", false);
      }).toThrowDeveloperError();
    });
  });
});
