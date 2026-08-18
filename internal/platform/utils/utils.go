package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

func ProjectRoot() string {
	_, thisFile, _, _ := runtime.Caller(0)
	root, err := findModuleRoot(filepath.Dir(thisFile))
	if err != nil {
		panic(err)
	}
	return root
}

func findModuleRoot(dir string) (string, error) {
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("go.mod not found above %s", dir)
		}
		dir = parent
	}
}
