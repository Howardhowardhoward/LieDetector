import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def createPulseData():
    blank=np.linspace(65,85,50)
    pulse=np.sin(blank)
    plt.plot(np.linspace(0,50),pulse)

createPulseData()