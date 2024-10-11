# Post-Disaster Inventory Simulation
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Personal Website](https://img.shields.io/badge/Kundakcioglu-Personal_Website-blue)](https://erhun.me)
[![Google Scholar](https://img.shields.io/badge/Kundakcioglu-Scholar_Profile-blue)](https://scholar.google.com/citations?user=k6NTKvsAAAAJ&hl=en)

This repository contains the code and main.java.data associated with the simulation model developed for the paper titled **Disaster Relief Inventory Simulation: Managing Resources in Humanitarian Camps**.

## 🚀 News
- **2024-10-21:** The [abstract](https://submissions.mirasmart.com/InformsAnnual2024/Itinerary/PresentationDetail.aspx?evdid=2259) will be presented at the 2024 INFORMS Annual Conference. A presentation summarizing the paper and simulation results can be accessed [here]().
- **2024-09-20:** The paper has been accepted for presentation at the 2024 INFORMS Winter Simulation Conference.

## Overview
The primary goal of this project is to provide a simulation-based approach to complement the analytical model developed within the scope of the Coordination and Management of Uncertainty in Refugee Camp Inventory Operations project. By simulating various scenarios, this study aims to derive valuable managerial insights, demonstrating how proposed policies and strategies could be implemented in real-life situations. The simulation will offer practical insights across different scenarios, enabling users to draw meaningful conclusions when analytical solutions may be difficult or impractical.

## 📄 Paper Abstract
Natural disasters and conflicts often result in humanitarian crises, necessitating effective inventory management to meet the needs of displaced populations. This paper introduces a sophisticated simulation model tailored for disaster relief scenarios. By integrating real-world dynamics and constraints, such as perishability of goods, budget constraints, and uncertain demand, the model offers a robust framework for decision-makers in humanitarian organizations addressing post-disaster inventory management challenges. The simulation tool is open source, promoting widespread adoption and adaptation, thereby enriching the humanitarian logistics toolbox. Computational experiments are conducted to validate the simulation engine and provide valuable insights.

## 📝 Citation

If you find the simulation engine useful for your research, please consider citing the associated [paper](). You can use the following **BibTeX** entry:

```bibtex
@inproceedings{yildiz2024disaster,
  author    = {C. Y. Yildiz and O. E. Kundakcioglu},
  title     = {Disaster Relief Inventory Simulation: Managing Resources in Humanitarian Camps},
  booktitle = {Proceedings of the 2024 INFORMS Winter Simulation Conference},
  year      = {2024},
  organization={IEEE Press}
}
```

> C. Y. Yildiz, and O. E. Kundakcioglu. "Disaster Relief Inventory Simulation: Managing Resources in Humanitarian Camps."
> *Proceedings of the 2024 INFORMS Winter Simulation Conference*, 2024.

## 📈 Installation and Usage 

First, clone the repository to your local machine using Git:

```bash
# Clone the repository
git clone https://github.com/OEKundakcioglu/PostDisasterSimulation.git
```

If you want to explore the simulation engine without managing dependencies manually, you can run the project directly 
using Gradle. Gradle is bundled with the project, so you don’t need to install it separately.

### On macOS and Linux:
```bash
./gradlew run
```
### On Windows:
```bash
gradlew run
```

If you plan to use the project in a research setting or modify the code, it’s recommended to build it using Gradle 
to avoid dependency conflicts. While it is possible to manually handle dependencies, this process can be challenging due 
to potential version incompatibilities. You can follow the instructions on the 
[Gradle website](https://docs.gradle.org/current/userguide/getting_started_eng.html).


## 📃 License
This project is licensed under the MIT License.