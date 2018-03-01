import axios from 'axios';

const createInstance = baseUrl => axios.create({
  baseUrl,
});

export default createInstance;
