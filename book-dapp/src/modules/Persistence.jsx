const Persistence = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.log(err);
    }
    return value;
  },
  get: (key, df) => {
    var result = df;
    try {
      result = JSON.parse(localStorage.getItem(key));
    } catch (err) {
      console.log(err);
    }
    return result;
  },
  delete: (key) => {
    localStorage.removeItem(key);
  },
};

export default Persistence;
