import { bookNftAddress } from "./Contract";

const Persistence = {
  set: (key, value) => {
    try {
      localStorage.setItem(`${bookNftAddress}-${key}`, JSON.stringify(value));
    } catch (err) {
      console.log(err);
    }
    return value;
  },
  get: (key, df) => {
    var result = df;
    try {
      result = JSON.parse(localStorage.getItem(`${bookNftAddress}-${key}`));
    } catch (err) {
      console.log(err);
    }
    return result;
  },
  delete: (key) => {
    localStorage.removeItem(`${bookNftAddress}-${key}`);
  },
};

export default Persistence;
