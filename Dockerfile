FROM ubuntu
RUN apt-get update
RUN apt-get install -y git nodejs npm
RUN git clone git://github.com/DuoSoftware/DVP-ARDSMonitoring.git /usr/local/src/ardsmonitoring
RUN cd /usr/local/src/ardsmonitoring; npm install
CMD ["nodejs", "/usr/local/src/ardsmonitoring/app.js"]

EXPOSE 8830
