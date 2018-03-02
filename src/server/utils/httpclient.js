import axios from 'axios';

const createInstance = baseURL => axios.create({
  baseURL,
  headers: {
    Authorization: 'allow',
  },
});

export default createInstance;
