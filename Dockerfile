#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm
#RUN git clone git://github.com/DuoSoftware/DVP-ARDSMonitoring.git /usr/local/src/ardsmonitoring
#RUN cd /usr/local/src/ardsmonitoring; npm install
#CMD ["nodejs", "/usr/local/src/ardsmonitoring/app.js"]

#EXPOSE 8830

# FROM node:9.9.0
# ARG VERSION_TAG
# RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-ARDSMonitoring.git /usr/local/src/ardsmonitoring
# RUN cd /usr/local/src/ardsmonitoring;
# WORKDIR /usr/local/src/ardsmonitoring
# RUN npm install
# EXPOSE 8830
# CMD [ "node", "/usr/local/src/ardsmonitoring/app.js" ]

FROM node:5.10.0
ARG VERSION_TAG
RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-ARDSMonitoring.git /usr/local/src/ardsmonitoring
RUN cd /usr/local/src/ardsmonitoring;
WORKDIR /usr/local/src/ardsmonitoring
RUN npm install
EXPOSE 8830
CMD [ "node", "/usr/local/src/ardsmonitoring/app.js" ]
