package utils

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFindModuleRoot_FindsModuleRootInParentDir(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example.com/test\n"), 0644))

	nested := filepath.Join(root, "a", "b", "c")
	require.NoError(t, os.MkdirAll(nested, 0755))

	found, err := findModuleRoot(nested)
	require.NoError(t, err)
	require.Equal(t, root, found)
}

func TestFindModuleRoot_FindsModuleRootInSameDir(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(root, "go.mod"), []byte("module example.com/test\n"), 0644))

	found, err := findModuleRoot(root)
	require.NoError(t, err)
	require.Equal(t, root, found)
}

func TestFindModuleRoot_NotFound(t *testing.T) {
	root := t.TempDir()

	_, err := findModuleRoot(root)
	require.Error(t, err)
}

func TestProjectRoot(t *testing.T) {
	root := ProjectRoot()
	_, err := os.Stat(filepath.Join(root, "go.mod"))
	require.NoError(t, err)
}
