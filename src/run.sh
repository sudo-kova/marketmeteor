#!/bin/bash
# sudo chmod +x run_scripts.sh

run_from_directory() {
    local DIR=$1
    echo -e "\033[0;32mAvailable scripts in ${DIR}:\033[0m"
    
    # Save the current directory and change to the target directory
    pushd "${DIR}" > /dev/null
    
    # List .py files in the target directory and prompt user to choose one to run
    select SCRIPT in *.py; do
        if [ -n "$SCRIPT" ]; then
            echo "Running $SCRIPT..."
            python "$SCRIPT"
        else
            echo "Invalid selection..."
        fi
        break
    done
    
    # Return to the original directory
    popd > /dev/null
}

echo -e "\033[0;32mSelect a category to run scripts from:\033[0m"
select CATEGORY in ../scripts/data_processing/signal_lists ../scripts/data_processing/PortSim ../scripts/data_processing/chartdata ../scripts/data_processing/historic_Pwin ../scripts/data_processing/heatmap; do
    case $CATEGORY in
        ../scripts/data_processing/signal_lists)
            run_from_directory $CATEGORY
            ;;
        ../scripts/data_processing/PortSim)
            run_from_directory $CATEGORY
            ;;
        ../scripts/data_processing/chartdata)
            run_from_directory $CATEGORY
            ;;
        ../scripts/data_processing/historic_Pwin)
            run_from_directory $CATEGORY
            ;;
        ../scripts/data_processing/heatmap)
            run_from_directory $CATEGORY
            ;;
        *)
            echo "Invalid selection..."
            ;;
    esac
    break
done