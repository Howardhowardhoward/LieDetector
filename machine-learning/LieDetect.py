import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json, math
import re

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler


faceData = [[] for i in range(30)]

for i in range(1,31):
    with open("C:/Users/Howar/Downloads/amanda_data/results"+str(i)+".json") as f:
        temp=json.load(f)

        for j in temp:
            temp2=[]
            for r in temp[j]:
                if type(r)==list:
                    val=r[0]
                else:
                    val=r
                temp2.append(val)
            faceData[i-1].append(np.var(np.array(temp2).astype(float)))
    with open("C:/Users/Howar/Downloads/amanda_data/gsrResults"+str(i)+".json") as f:
        temp=json.load(f)
        #filter values that don't look like decimal numbers
        my_regex = re.compile(r"^\d+\.?\d*$")
        temp=list(filter(lambda x: my_regex.match(x) ,temp))
        for j in range(5):
            faceData[i-1].append(np.var(np.array(temp).astype(float)))
    with open("C:/Users/Howar/Downloads/amanda_data/hrResults"+str(i)+".json") as f:
        temp=json.load(f)
        for j in range(3):
            faceData[i-1].append(np.mean(np.array(temp).astype(float)))

print(pd.DataFrame(faceData))

differences=[[] for i in range(5)]

testLies=[2,5,6,8,9]
testTruth=[1,3,4,7,10]

liesAverages=[]
truthAverages=[]
for col in range(68):
    liesAverages.append(np.average(np.array(faceData)[testLies,col]))
    truthAverages.append(np.average(np.array(faceData)[testTruth,col]))
avgDifferences=np.array(liesAverages)-np.array(truthAverages)
#print(avgDifferences)
significantIndices=[]
insignificantIndices=[]
for i in range(68):
    if abs(avgDifferences[i])>15:
        significantIndices.append(i)
    elif abs(avgDifferences[i])<5:
        insignificantIndices.append(i)
print(significantIndices)
print(insignificantIndices)

faceData2=[[] for i in range(20)]
for i in range(0,20):
    #print(faceData[i])
    for j in range(len(faceData[i])):
        if j in significantIndices:
            for k in range(4):
                faceData2[i].append(faceData[i+10][j])
        elif j in insignificantIndices:
            faceData2[i].append(faceData[i+10][j])
        else:
            for k in range(2):
                faceData2[i].append(faceData[i+10][j])

print(pd.DataFrame(faceData2))

lieTruthKey=[1,0,1,1,0,0,1,0,1,0]
trainingData=faceData[0:10]
testingData=faceData2
X=StandardScaler().fit_transform(trainingData)
pca=PCA(n_components=2)
trainPCA=pca.fit_transform(X)
Y=StandardScaler().fit_transform(faceData2)
testPCA=pca.fit_transform(Y)
from sklearn.neighbors import KNeighborsClassifier
neigh = KNeighborsClassifier(n_neighbors=7)
neigh.fit(trainPCA, lieTruthKey)
print(neigh.predict(testPCA))
print(len(testingData))

